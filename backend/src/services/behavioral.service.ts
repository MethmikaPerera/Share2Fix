import crypto from 'node:crypto';
import { COLLECTIONS, db } from '../config/firebase';
import type { AiAnalysis, AuthUser, BehavioralCheck, ReportDoc } from '../types';
import { haversineKm } from '../utils/geo';
import type { CreateReportInput } from '../validators/schemas';

export const behavioralService = {
  /** Computes SHA-256 hashes for all uploaded file buffers. */
  hashFiles(files: Express.Multer.File[]): string[] {
    return files.map((file) => crypto.createHash('sha256').update(file.buffer).digest('hex'));
  },

  /**
   * Evaluates the citizen's reporting behavior patterns and image verification
   * to produce a trust score and risk assessment.
   */
  async checkSubmission(
    user: AuthUser,
    input: CreateReportInput,
    files: Express.Multer.File[],
    aiAnalysis: AiAnalysis,
  ): Promise<BehavioralCheck> {
    const hashes = this.hashFiles(files);
    const flags: string[] = [];
    let trustScore = 100;

    // 1. Duplicate Image Check
    let isDuplicateImage = false;
    let duplicateReportId: string | null = null;
    if (hashes.length > 0) {
      try {
        for (const hash of hashes) {
          const snap = await db.collection(COLLECTIONS.reports).where('imageHashes', 'array-contains', hash).limit(1).get();
          if (!snap.empty) {
            isDuplicateImage = true;
            duplicateReportId = snap.docs[0]!.id;
            break;
          }
        }
      } catch (err) {
        console.warn('[behavioral] duplicate image check error:', err instanceof Error ? err.message : err);
      }
    }

    if (isDuplicateImage) {
      flags.push(`DUPLICATE_IMAGE: Uploaded photograph matches an existing report (${duplicateReportId})`);
      trustScore -= 50;
    }

    // 2. User Submission Velocity & Geo History
    let velocityCountLast5Min = 0;
    let countLast1Hour = 0;
    let lastReport: ReportDoc | null = null;

    try {
      const recentSnaps = await db
        .collection(COLLECTIONS.reports)
        .where('createdBy', '==', user.uid)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();

      const now = Date.now();
      const recentReports = recentSnaps.docs.map((d) => d.data() as ReportDoc);

      if (recentReports.length > 0) {
        lastReport = recentReports[0]!;
      }

      for (const r of recentReports) {
        if (r.createdAt) {
          const ageMs = now - r.createdAt.toMillis();
          if (ageMs <= 5 * 60 * 1000) velocityCountLast5Min++;
          if (ageMs <= 60 * 60 * 1000) countLast1Hour++;
        }
      }
    } catch (err) {
      console.warn('[behavioral] velocity check error:', err instanceof Error ? err.message : err);
    }

    if (velocityCountLast5Min >= 3) {
      flags.push(`BURST_VELOCITY: ${velocityCountLast5Min} reports submitted in the last 5 minutes`);
      trustScore -= 35;
    } else if (countLast1Hour >= 8) {
      flags.push(`HIGH_HOURLY_VOLUME: ${countLast1Hour} reports submitted in the past hour`);
      trustScore -= 20;
    }

    // 3. Geo-Anomaly / Impossible Travel Speed
    let geoSpeedKmH: number | undefined;
    let impossibleTravel = false;
    let nearbyDuplicate = false;

    if (lastReport && lastReport.createdAt && lastReport.location) {
      const ageHours = (Date.now() - lastReport.createdAt.toMillis()) / (1000 * 60 * 60);
      const distKm = haversineKm(lastReport.location.latitude, lastReport.location.longitude, input.latitude, input.longitude);

      if (ageHours > 0 && ageHours < 3) {
        const speed = distKm / ageHours;
        geoSpeedKmH = Math.round(speed);

        // Realistic transit speed threshold in Sri Lanka: > 180 km/h with distance > 25 km
        if (distKm > 25 && speed > 180) {
          impossibleTravel = true;
          flags.push(`GEO_ANOMALY: Impossible travel velocity (${geoSpeedKmH} km/h, ${distKm.toFixed(1)} km in ${Math.round(ageHours * 60)} min)`);
          trustScore -= 35;
        }
      }

      // Check if user submitted another report at virtually the exact same point (< 25m) recently (< 2 hours)
      if (distKm < 0.025 && ageHours < 2) {
        nearbyDuplicate = true;
        flags.push('NEARBY_REDUNDANT: Consecutive report submitted within 25m within 2 hours');
        trustScore -= 20;
      }
    }

    // 4. Multimodal AI Image Verification
    const verification = aiAnalysis.imageVerification;
    const isCivicIssue = verification ? verification.isCivicIssue : true;
    const matchesDescription = verification ? verification.matchesDescription : true;
    const imageAuthenticityScore = verification ? verification.authenticityScore : 1.0;
    const aiFlagged = verification ? verification.flagged : false;

    if (aiFlagged) {
      if (!isCivicIssue) {
        flags.push(`NON_CIVIC_IMAGE: ${verification?.flagReason || 'Photo does not appear to show a public infrastructure issue'}`);
        trustScore -= 40;
      }
      if (!matchesDescription) {
        flags.push('DESCRIPTION_MISMATCH: Photo content does not correlate with the report title/description');
        trustScore -= 25;
      }
    }

    trustScore = Math.max(0, Math.min(100, trustScore));

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (trustScore < 45) {
      riskLevel = 'HIGH';
    } else if (trustScore < 75) {
      riskLevel = 'MEDIUM';
    }

    const passed = riskLevel !== 'HIGH';

    return {
      trustScore,
      riskLevel,
      flags,
      passed,
      details: {
        velocityCountLast5Min,
        geoSpeedKmH,
        isDuplicateImage,
        imageAuthenticityScore,
        isCivicIssue,
        matchesDescription,
      },
    };
  },
};
