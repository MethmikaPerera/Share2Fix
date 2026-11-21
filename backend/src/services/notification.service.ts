import { notificationsRepo } from '../repositories/activity.repository';
import { AppError } from '../utils/errors';
import { toNotificationDto } from '../utils/mappers';

export const notificationService = {
  async list(uid: string) {
    const items = (await notificationsRepo.listForUser(uid)).map(toNotificationDto);
    return { items, unread: items.filter((n) => !n.read).length };
  },

  async markRead(uid: string, id: string) {
    const n = await notificationsRepo.get(id);
    if (!n || n.userId !== uid) throw AppError.notFound('Notification not found');
    await notificationsRepo.markRead(id);
  },

  async markAllRead(uid: string) {
    await notificationsRepo.markAllRead(uid);
  },
};
