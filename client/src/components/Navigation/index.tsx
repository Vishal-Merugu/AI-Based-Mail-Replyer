import { NavigationBar } from "./navigationBar";
import { NavigationRoutes } from "./navigationRoutes";

export function Navigator(): JSX.Element {
  return (
    <div>
      <NavigationBar />
      <NavigationRoutes />
    </div>
  );
}
