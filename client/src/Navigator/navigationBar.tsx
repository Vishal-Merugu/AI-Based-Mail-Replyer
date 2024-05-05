import { useNavigate } from "react-router-dom";

import styles from "./styles.module.css";

export const navOptions = [
  {
    title: "Home",
    path: "/",
  },
  {
    title: "Connect Email",
    path: "/connect_email",
  },
  {
    title: "Send Emails",
    path: "/send_emails",
  },
];

export function NavigationBar(): JSX.Element {
  let navigate = useNavigate();
  function handleRoute(path: string) {
    navigate(path);
  }

  return (
    <div className={styles.NavigationBar}>
      <div className={styles.navigationContainer}>
        {navOptions.map((option, index) => {
          return (
            <div
              key={index}
              className={styles.navOption}
              onClick={() => handleRoute(option.path)}
            >
              {option.title}
            </div>
          );
        })}
      </div>
    </div>
  );
}
