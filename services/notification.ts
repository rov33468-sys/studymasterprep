import { storageService } from './storage';

export const notificationService = {
  // Request permission from browser
  requestPermission: async () => {
    if (!("Notification" in window)) {
      console.warn("This browser does not support desktop notifications");
      return false;
    }
    
    if (Notification.permission === "granted") {
      return true;
    }
    
    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }
    
    return false;
  },

  // Send a notification
  send: (title: string, body?: string) => {
      if (Notification.permission === "granted") {
          // Use a simple icon or fallback
          const options = {
              body,
              icon: 'https://cdn-icons-png.flaticon.com/512/3233/3233497.png' // Generic study icon
          };
          new Notification(title, options);
      } else {
          console.log(`Notification [${title}]: ${body}`);
      }
  },

  // Check loop
  check: () => {
      // 1. Check Master Switch
      const settings = storageService.getSettings();
      if (!settings.notifications) return;

      const now = new Date();
      // Current 24h time HH:MM
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTime24 = `${currentHours}:${currentMinutes}`;
      
      // Current 12h time HH:MM AM/PM (for tasks)
      let hours12 = now.getHours();
      const ampm = hours12 >= 12 ? 'PM' : 'AM';
      hours12 = hours12 % 12;
      hours12 = hours12 ? hours12 : 12; // the hour '0' should be '12'
      const currentTime12 = `${hours12}:${currentMinutes} ${ampm}`;

      // Current Date YYYY-MM-DD
      const todayStr = now.toISOString().split('T')[0];
      const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      const currentDayLabel = weekDays[now.getDay()];

      // --- 2. Check Study Reminder ---
      const reminderConfig = storageService.getReminderConfig();
      
      if (reminderConfig.enabled) {
          // Check if time matches
          if (reminderConfig.time === currentTime24) {
              // Check frequency
              let shouldNotify = false;
              if (reminderConfig.frequency === 'Daily') {
                  shouldNotify = true;
              } else if (reminderConfig.frequency === 'Weekly' && reminderConfig.days.includes(currentDayLabel)) {
                  shouldNotify = true;
              }

              // Prevent double firing in same minute
              const lastSent = sessionStorage.getItem('last_study_reminder');
              if (shouldNotify && lastSent !== currentTime24) {
                  notificationService.send("Time to Study!", "Your scheduled study session starts now. Keep up the streak!");
                  sessionStorage.setItem('last_study_reminder', currentTime24);
              }
          }
      }

      // --- 3. Check Task Deadlines ---
      const tasks = storageService.getTasks();
      tasks.forEach(task => {
          if (task.completed) return;
          
          // Normalize Task Date
          let taskDateStr = '';
          if (task.date === 'Today') taskDateStr = todayStr;
          else if (task.rawDate) taskDateStr = task.rawDate.split('T')[0];
          
          // Check if Task is Today
          if (taskDateStr === todayStr) {
              // Check time match (simple string match for now)
              // Task time format in DB is like "10:00 AM" or "2:30 PM"
              
              // Normalize task time to compare strictly
              // Removing leading zeros from task time if any (e.g. 02:00 PM -> 2:00 PM) to match currentTime12 logic if needed, 
              // but standardizing on exact string match is safest if input is consistent.
              // Let's assume input saves as "10:00 AM".
              
              if (task.time === currentTime12) {
                   const key = `task_remind_${task.id}`;
                   const lastSent = sessionStorage.getItem(key);
                   
                   if (lastSent !== currentTime12) {
                       notificationService.send(`Task Due: ${task.title}`, `It's time for ${task.subject}.`);
                       sessionStorage.setItem(key, currentTime12);
                   }
              }
          }
      });
  }
};