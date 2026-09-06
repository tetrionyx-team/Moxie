import React from "react";
import Logo from "./Logo/Logo";
import SearchBar from "./SearchBar/SearchBar";
import NavMenu from "./NavMenu/NavMenu";
import NavBottom from "./NavBottom/NavBottom";
import "./Header.css";

function Header({ searchQuery, setSearchQuery }) {
  return (
    <header className="site-header">
      <div className="main-header-wrapper">
        <div className="container">
          <div className="header">
            <Logo />
            <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
            <NavMenu />
          </div>
        </div>
      </div>
      <NavBottom />
    </header>
  );
}

export default Header;
