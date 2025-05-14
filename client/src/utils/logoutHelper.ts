export const logoutGuide = () => {
    localStorage.removeItem("guide_token");
    window.location.href = "/guide/login"; // or just reload the app
  };
  