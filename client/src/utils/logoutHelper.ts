export const logoutGuide = () => {
    localStorage.removeItem("guide_token");
    localStorage.removeItem("guide_data"); // FC-7 fix: Clear guide profile data on logout
    window.location.href = "/guide/login";
};

export const logoutCustomer = () => {
    localStorage.removeItem("userToken");
    window.location.href = "/login";
};