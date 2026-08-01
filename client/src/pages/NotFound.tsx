import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ErrorStatePage } from "@/components/ErrorStatePage";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.warn("Unknown WellCare route", location.pathname);
  }, [location.pathname]);

  return <ErrorStatePage kind="not-found" />;
};

export default NotFound;
