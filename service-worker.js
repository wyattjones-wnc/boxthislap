const FOOTY_PUSH_ENDPOINT = "";

self.addEventListener("push", (event) => {
  event.waitUntil(showPendingFootyNotifications());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "./#footy";

  event.waitUntil((async () => {
    const windowClients = await clients.matchAll({ includeUncontrolled: true, type: "window" });
    const existingClient = windowClients.find((client) => "focus" in client);

    if (existingClient) {
      await existingClient.navigate(targetUrl);
      return existingClient.focus();
    }

    return clients.openWindow(targetUrl);
  })());
});

async function showPendingFootyNotifications() {
  if (!FOOTY_PUSH_ENDPOINT) {
    await self.registration.showNotification("Box This Lap", {
      body: "A match alert is ready.",
      data: { url: "./#footy" },
      tag: "box-this-lap-footy-alert",
    });
    return;
  }

  const subscription = await self.registration.pushManager.getSubscription();

  if (!subscription?.endpoint) {
    return;
  }

  const response = await fetch(`${FOOTY_PUSH_ENDPOINT.replace(/\/$/, "")}/pending`, {
    body: JSON.stringify({ endpoint: subscription.endpoint }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    await self.registration.showNotification("Box This Lap", {
      body: "A match alert is ready.",
      data: { url: "./#footy" },
      tag: "box-this-lap-footy-alert",
    });
    return;
  }

  const data = await response.json();
  const notifications = Array.isArray(data.notifications) ? data.notifications : [];

  if (notifications.length === 0) {
    return;
  }

  await Promise.all(notifications.map((notification) =>
    self.registration.showNotification(notification.title || "Match alert", {
      body: notification.body || "",
      data: { url: notification.url || "./#footy" },
      tag: notification.tag || `box-this-lap-footy-${Date.now()}`,
    })
  ));
}
