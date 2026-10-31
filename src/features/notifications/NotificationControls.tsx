import { lazy, Suspense, type ComponentProps } from "react";

const Setting = lazy(() =>
  import("./NotificationTests").then((module) => ({
    default: module.NotificationTestSetting,
  })),
);
const Button = lazy(() =>
  import("./NotificationTests").then((module) => ({
    default: module.NotificationTestButton,
  })),
);

export function NotificationTestSetting() {
  return (
    <Suspense fallback={null}>
      <Setting />
    </Suspense>
  );
}
export function NotificationTestButton(props: ComponentProps<typeof Button>) {
  return (
    <Suspense fallback={null}>
      <Button {...props} />
    </Suspense>
  );
}
