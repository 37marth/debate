/**
 * Header 컴포넌트 - 사이드바 네비게이션 방식
 *
 * 기능:
 * - 햄버거 메뉴를 통한 사이드바 오픈
 * - 고정 헤더 (position: fixed)
 * - 로고 표시
 * - 테마 전환 버튼
 * - 사용자 인증 상태에 따른 UI 변경
 * - 알림 아이콘 (인증된 사용자)
 * - 사용자 아바타 (인증된 사용자)
 * - 활성화된 페이지 메뉴 하이라이트
 *
 * 변경사항:
 * - 헤더 중앙의 검색바 제거됨 (홈페이지 본문으로 이동)
 * - 사이드바 메뉴로 네비게이션 개선
 * - 현재 활성화된 페이지에 색상 표시 추가
 * - [수정] 사이드바 로그아웃 버튼 스타일 일관성 개선
 */
import axios from "axios";
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import "./Header.css";
import UserAvatar from "./UserAvatar";
import debateLogoLight from "../../assets/debate-onlylogo.png";
import debateLogoDark from "../../assets/debate-logo-dark.png";

/**
 * Header 컴포넌트
 *
 * @returns {JSX.Element} 헤더 컴포넌트
 */
const Header = () => {
  // ===== Hooks 선언 =====
  const { user, logout, isAuthenticated } = useAuth(); // 인증 관련 상태 및 함수
  const { theme, toggleTheme } = useTheme(); // 테마 관련 상태 및 함수
  const navigate = useNavigate(); // 페이지 이동을 위한 navigate 함수
  const location = useLocation(); // 현재 경로 확인을 위한 location 훅
  const currentLogo = theme === "dark" ? debateLogoDark : debateLogoLight;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // 사이드바 열림/닫힘 상태
  const [unreadCount, setUnreadCount] = useState(0); // 추가
  const [isNotificationOpen, setIsNotificationOpen] = useState(false); // 추가
  const [notifications, setNotifications] = useState([]); // 추가
  // ===== 프로필 드롭다운 상태 =====
  // 프로필(아바타)을 눌렀을 때 드롭다운 메뉴 열림/닫힘을 관리
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  /**
   * 현재 경로가 특정 경로와 일치하는지 확인하는 함수
   *
   * @param {string} path - 확인할 경로
   * @returns {boolean} 일치 여부
   */
  const isActive = (path) => {
    return location.pathname === path;
  };

  // 프로필 메뉴 토글 (열기/닫기)
  const toggleProfileMenu = () => {
    setIsProfileMenuOpen(!isProfileMenuOpen);
  };

  // 프로필 메뉴 닫기
  const closeProfileMenu = () => {
    setIsProfileMenuOpen(false);
  };

  // 알림 메뉴 토글
  const toggleNotificationMenu = () => {
    setIsNotificationOpen(!isNotificationOpen);
  };

  // 알림 메뉴 닫기
  const closeNotificationMenu = () => {
    setIsNotificationOpen(false);
  };

  /**
   * 로그아웃 처리 함수
   *
   * 동작:
   * 1. 로그아웃 실행 (AuthContext의 logout 함수 호출)
   * 2. 메인 페이지로 이동
   * 3. 사이드바 닫기
   */
  const handleLogout = () => {
    logout();
    navigate("/");
    setIsSidebarOpen(false);
  };

  /**
   * 사이드바 토글 함수
   *
   * 사이드바의 열림/닫힘 상태를 반전시킵니다.
   */
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  /**
   * 사이드바 닫기 함수
   *
   * 메뉴 항목 클릭 시 사이드바를 닫습니다.
   */
  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  /**
   * 사이드바 열림/닫힘에 따라 body 스크롤 제어
   * 모바일에서 사이드바가 열렸을 때 배경 스크롤 방지
   */
  useEffect(() => {
    if (isSidebarOpen) {
      // 사이드바가 열렸을 때 body 스크롤 막기
      document.body.style.overflow = "hidden";
    } else {
      // 사이드바가 닫혔을 때 body 스크롤 복원
      document.body.style.overflow = "";
    }

    // 컴포넌트 언마운트 시 스크롤 복원
    return () => {
      document.body.style.overflow = "";
    };
  }, [isSidebarOpen]);

  // 알람 개수 및 목록 fetch
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!isAuthenticated) return;

      try {
        // [수정됨] /api 제거 -> axios 기본 설정과 합쳐져서 /api/notifications 가 됨
        const response = await axios.get('/notifications');

        const { notifications, unreadCount } = response.data;

        setNotifications(notifications || []);
        setUnreadCount(unreadCount || 0);
      } catch (error) {
        console.error('알림 로딩 실패:', error);
      }
    };

    fetchNotifications();

    const interval = setInterval(fetchNotifications, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // 알림 클릭 처리 함수
  const handleNotificationClick = async (notification) => {
    closeNotificationMenu();

    if (!notification.isRead) {
      try {
        // [수정됨] /api 제거
        await axios.post(`/notifications/${notification.id}/read`);

        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('알림 읽음 처리 실패:', error);
      }
    }

    if (notification.url) {
      navigate(notification.url);
    } else {
      console.warn('이동할 URL이 없습니다.');
    }
  };

  return (
    <>
      {/* ===== 고정 헤더 ===== */}
      <header className="header-fixed">
        <div className="header-container">
          {/* 왼쪽 영역: 햄버거 메뉴 + 로고 */}
          <div className="header-left">
            {/* 햄버거 메뉴 버튼 */}
            <button
              className="hamburger-btn"
              onClick={toggleSidebar}
              aria-label="메뉴 열기"
              aria-expanded={isSidebarOpen}
            >
              {/* 햄버거 아이콘 (3줄) */}
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            {/* 로고 */}
            <Link to="/" className="header-logo">
              <img
                src={currentLogo}
                alt="DEBATE"
                className="logo-image"
                style={{ width: "50px", height: "100px" }}
              />
              <span className="logo-text">DEBATE</span>
            </Link>
          </div>

          {/* 중앙 영역: 네비게이션 메뉴 */}
          <div className="header-center">
            <nav className="header-nav">
              {/* 토론 목록 */}
              <Link
                to="/debate"
                className={`header-nav-item ${isActive("/debate") ? "active" : ""
                  }`}
              >
                토론목록
              </Link>

              {/* 토론 작성 (항상 표시, 클릭 시 로그인 필요 시 로그인 페이지로 이동) */}
              <Link
                to="/debate/create"
                className={`header-nav-item ${isActive("/debate/create") ? "active" : ""
                  }`}
              >
                토론작성
              </Link>

              {/* 카테고리 */}
              <Link
                to="/categories"
                className={`header-nav-item ${isActive("/categories") ? "active" : ""
                  }`}
              >
                카테고리
              </Link>

              {/* 랭킹 */}
              <Link
                to="/ranking"
                className={`header-nav-item ${isActive("/ranking") ? "active" : ""
                  }`}
              >
                랭킹
              </Link>
            </nav>
          </div>

          {/* 오른쪽 영역: 테마 전환 + 사용자 메뉴 */}
          <div className="header-right">
            {/* 테마 전환 버튼 (다크모드/라이트모드) */}
            <button
              className="icon-btn theme-btn"
              onClick={toggleTheme}
              aria-label="테마 전환"
            >
              {theme === "light" ? (
                // 라이트 모드일 때 달 아이콘 (다크모드로 전환)
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                // 다크 모드일 때 해 아이콘 (라이트모드로 전환)
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              )}
            </button>

            {/* 로그인된 경우: 알림 + 아바타 */}
            {isAuthenticated ? (
              <>
                {/* 알림 아이콘 */}
                <div className="notification-wrapper">
                  <button
                    className="icon-btn notification-btn"
                    aria-label="알림"
                    onClick={toggleNotificationMenu}
                    aria-expanded={isNotificationOpen}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                    )}
                  </button>

                  {/* 알림 드롭다운 */}
                  {isNotificationOpen && (
                    <>
                      <div
                        className="dropdown-overlay"
                        onClick={closeNotificationMenu}
                      />
                      <div className="notification-dropdown">
                        <div className="notification-header">
                          <h3>알림</h3>
                          {notifications.length > 0 && (
                            <button className="mark-all-read">모두 읽음</button>
                          )}
                        </div>
                        <div className="notification-list">
                          {notifications.length > 0 ? (
                            notifications.map((notification) => (
                              <div
                                key={notification.id}
                                className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                                onClick={() => handleNotificationClick(notification)}
                              >
                                <div className="notification-icon">
                                  {notification.type === 'comment' ? '💬' :
                                    notification.type === 'like' ? '👍' :
                                      notification.type === 'message' ? '📨' : '🔔'}
                                </div>
                                <div className="notification-content">
                                  <p className="notification-text">{notification.message}</p>
                                  <span className="notification-time">{notification.time}</span>
                                </div>
                                {!notification.isRead && <span className="unread-dot"></span>}
                              </div>
                            ))
                          ) : (
                            <div className="no-notifications">
                              <svg
                                width="48"
                                height="48"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                opacity="0.3"
                              >
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                              </svg>
                              <p>알림이 비어있습니다</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* 사용자 아바타 (프로필 메뉴 토글) */}
                <div className="user-avatar-wrapper">
                  <button
                    className="user-avatar"
                    onClick={toggleProfileMenu}
                    aria-label="사용자 메뉴"
                    aria-expanded={isProfileMenuOpen}
                  >
                    {/* 프로필 이미지가 있으면 표시, 없으면 기본 아이콘 */}
                    <UserAvatar
                      src={user?.profileImage}
                      alt={user?.nickname || "사용자"}
                      size="medium"
                      showModal={false}
                    />
                  </button>

                  {/* 프로필 드롭다운 메뉴 */}
                  {isProfileMenuOpen && (
                    <>
                      {/* 드롭다운 배경 클릭 시 닫기 */}
                      <div
                        className="dropdown-overlay"
                        onClick={closeProfileMenu}
                      />

                      {/* 드롭다운 메뉴 */}
                      <div className="profile-dropdown">
                        {/* 메뉴 항목들 */}
                        <div className="dropdown-menu">
                          {/* 마이페이지 */}
                          <Link
                            to="/my"
                            className="dropdown-item"
                            onClick={closeProfileMenu}
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                            마이페이지
                          </Link>

                          {/* 내가 쓴 토론 */}
                          <Link
                            to="/my?tab=my-debate"
                            className="dropdown-item"
                            onClick={closeProfileMenu}
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            내가 쓴 토론
                          </Link>

                          {/* 설정 */}
                          <Link
                            to="/my/edit"
                            className="dropdown-item"
                            onClick={closeProfileMenu}
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="12" cy="12" r="3" />
                              <path d="M12 1v6M12 17v6M4.22 4.22l4.25 4.25M15.54 15.54l4.25 4.25M1 12h6M17 12h6M4.22 19.78l4.25-4.25M15.54 8.46l4.25-4.25" />
                            </svg>
                            설정
                          </Link>

                          {/* 구분선 */}
                          <div className="dropdown-divider" />

                          {/* 로그아웃 */}
                          <button
                            className="dropdown-item dropdown-item-danger"
                            onClick={() => {
                              handleLogout();
                              closeProfileMenu();
                            }}
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                              <polyline points="16 17 21 12 16 7" />
                              <line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                            로그아웃
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              /* 로그인되지 않은 경우: 로그인 + 회원가입 버튼 */
              <div className="auth-buttons">
                <Link to="/auth/login" className="btn btn-primary">
                  로그인
                </Link>
                <Link to="/auth/register" className="btn btn-primary">
                  회원가입
                </Link>
              </div>
            )}
          </div>
        </div>
      </header >

      {/* ===== 사이드바 오버레이 (배경 클릭 시 닫기) ===== */}
      {
        isSidebarOpen && (
          <div className="sidebar-overlay" onClick={closeSidebar} />
        )
      }

      {/* ===== 사이드바 ===== */}
      <aside className={`sidebar ${isSidebarOpen ? "sidebar-open" : ""}`}>
        {/* 사이드바 헤더 */}
        <div className="sidebar-header">
          <h2 className="sidebar-title">메뉴</h2>
          {/* 닫기 버튼 */}
          <button
            className="sidebar-close"
            onClick={closeSidebar}
            aria-label="메뉴 닫기"
          >
            {/* X 아이콘 */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* 사이드바 네비게이션 */}
        <nav className="sidebar-nav">
          {/* ===== 메인 메뉴 섹션 ===== */}
          <div className="nav-section">
            <h3 className="nav-section-title">메인</h3>

            {/* 홈 메뉴 */}
            <Link
              to="/"
              className={`nav-item ${isActive("/") ? "active" : ""}`}
              onClick={closeSidebar}
            >
              <svg
                className="nav-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span>홈</span>
            </Link>

            {/* 토론 목록 메뉴 */}
            <Link
              to="/debate"
              className={`nav-item ${isActive("/debate") ? "active" : ""}`}
              onClick={closeSidebar}
            >
              <svg
                className="nav-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m21 15-3-3h-2l-3 3v-2l3-3h2l3-3" />
                <path d="M9 15 6 12H4l-3 3v-2l3-3h2l3-3" />
              </svg>
              <span>토론목록</span>
            </Link>

            {/* 토론 작성 메뉴 */}
            <Link
              to="/debate/create"
              className={`nav-item ${isActive("/debate/create") ? "active" : ""}`}
              onClick={closeSidebar}
            >
              <svg
                className="nav-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span>토론작성</span>
            </Link>

            {/* 카테고리 메뉴 */}
            <Link
              to="/categories"
              className={`nav-item ${isActive("/categories") ? "active" : ""}`}
              onClick={closeSidebar}
            >
              <svg
                className="nav-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              <span>카테고리</span>
            </Link>

            {/* 랭킹 메뉴 */}
            <Link
              to="/ranking"
              className={`nav-item ${isActive("/ranking") ? "active" : ""}`}
              onClick={closeSidebar}
            >
              <svg
                className="nav-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
              </svg>
              <span>랭킹</span>
            </Link>
          </div>

          {/* ===== 마이페이지 섹션 (로그인 시에만 표시) ===== */}
          {isAuthenticated && (
            <div className="nav-section">
              <h3 className="nav-section-title">마이페이지</h3>

              {/* 프로필 메뉴 */}
              <Link
                to="/my"
                className={`nav-item ${isActive("/my") ? "active" : ""}`}
                onClick={closeSidebar}
              >
                <svg
                  className="nav-icon"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>프로필</span>
              </Link>

              {/* 내가 쓴 토론 메뉴 */}
              <Link
                to="/my?tab=my-debate"
                className="nav-item"
                onClick={closeSidebar}
              >
                <svg
                  className="nav-icon"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <span>내가 쓴 토론</span>
              </Link>

              {/* 설정 메뉴 */}
              <Link
                to="/settings"
                className={`nav-item ${isActive("/settings") ? "active" : ""}`}
                onClick={closeSidebar}
              >
                <svg
                  className="nav-icon"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v6m0 6v6" />
                  <path d="m4.93 4.93 4.24 4.24m5.66 5.66 4.24 4.24" />
                  <path d="M1 12h6m6 0h6" />
                  <path d="m4.93 19.07 4.24-4.24m5.66-5.66 4.24-4.24" />
                </svg>
                <span>설정</span>
              </Link>

              {/* 로그아웃 버튼 */}
              <button
                className="nav-item nav-item-danger"
                onClick={() => {
                  handleLogout();
                  closeProfileMenu();
                }}
              >
                <svg
                  className="nav-icon" // <--- ADDED
                  width="20" // <--- CHANGED: 16 -> 20
                  height="20" // <--- CHANGED: 16 -> 20
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>로그아웃</span> {/* <--- ADDED <span> tag */}
              </button>
            </div>
          )}

          {/* ===== 로그인하지 않은 경우 ===== */}
          {!isAuthenticated && (
            <div className="nav-section">
              <h3 className="nav-section-title">계정</h3>

              {/* 로그인 메뉴 */}
              <Link
                to="/auth/login"
                className="nav-item"
                onClick={closeSidebar}
              >
                <svg
                  className="nav-icon"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                <span>로그인</span>
              </Link>

              {/* 회원가입 메뉴 */}
              <Link
                to="/auth/register"
                className="nav-item"
                onClick={closeSidebar}
              >
                <svg
                  className="nav-icon"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
                <span>회원가입</span>
              </Link>
            </div>
          )}
        </nav>

        {/* 사이드바 푸터 */}
        <div className="sidebar-footer">
          <p className="sidebar-footer-text">© 2024 DEBATE</p>
        </div>
      </aside>
    </>
  );
};

export default Header;
