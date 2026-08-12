// Maps to the (not-yet-applied) notification_settings table — see
// docs/migrations-drafts/009_tracked_parity_tier_b.sql. Storing this
// preference is client-only progress: the send-push-on-message edge
// function (dashboard repo) must separately read and honor it before
// quiet hours actually suppress a push — see the caveat in that migration.

export interface NotificationSettings {
  quietHoursEnabled: boolean;
  quietHoursStart: string | null; // "HH:mm"
  quietHoursEnd: string | null;
  mutePersonal: boolean;
  muteCoaching: boolean;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  mutePersonal: false,
  muteCoaching: false,
};
