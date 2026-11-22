import { useEffect } from "react";
import { useSync } from "@/sync/useSync";
import { repo } from "@/sync/repo";
import { syncWidgetSnapshot } from "@/features/widget/widgetBridge";
import { rescheduleDailyReminders } from "@/features/reminders/dailyReminder";

const SyncMount = () => {
  useSync();

  useEffect(() => {
    const refreshRetention = () => {
      void syncWidgetSnapshot();
      void rescheduleDailyReminders(undefined, false);
    };

    refreshRetention();

    let timer: number | null = null;
    const unsub = repo.subscribeChange(() => {
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = null;
        refreshRetention();
      }, 500);
    });

    return () => {
      unsub();
      if (timer !== null) window.clearTimeout(timer);
    };
  }, []);

  return null;
};

export default SyncMount;
