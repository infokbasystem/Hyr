import { Outlet } from "react-router-dom";
import bg from "../assets/content.png";

const MainLayout = () => {
  return (
    <div className="flex grow items-stretch bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50" style={{ backgroundImage: `url(${bg})` }}>
      <Outlet />
    </div>
  );
};

export default MainLayout;
