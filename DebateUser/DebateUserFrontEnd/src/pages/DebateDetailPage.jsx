import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { debateService } from "../services/debateService";
import { commentService } from "../services/commentService";
import { opinionService } from "../services/opinionService";
import { likeService } from "../services/likeService";
import { reportService } from "../services/reportService";
import { format } from "date-fns";
import "./DebateDetailPage.css";
import ChatWidget from "../components/ChatWidget";
import UserAvatar from "../components/common/UserAvatar";

const DebateDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  // 데이터 상태
  const [debate, setDebate] = useState(null);
  const [comments, setComments] = useState([]);
  const [opinions, setOpinions] = useState([]);
  const [bestComments, setBestComments] = useState([]);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // [추가] 페이징 및 정렬 상태
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [sort, setSort] = useState("latest"); // latest, oldest, replies

  // 입력 상태
  const [commentContent, setCommentContent] = useState("");
  const [replyContent, setReplyContent] = useState("");

  const [replyingTo, setReplyingTo] = useState(null);
  // [추가] 댓글 수정 상태
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editContent, setEditContent] = useState("");

  // UI 상태 (메뉴)
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // 초기 로딩
  useEffect(() => {
    fetchData();
  }, [id]);

  // [추가] 페이지나 정렬 변경 시 댓글 다시 로드
  useEffect(() => {
    if (debate) {
      fetchComments();
    }
  }, [page, sort]);

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // [추가] 인증 상태 변경 시 좋아요 상태 확인
  useEffect(() => {
    if (isAuthenticated && id) {
      const checkLikeStatus = async () => {
        try {
          const liked = await likeService.isLiked(id);
          setIsLiked(liked.data || liked);
        } catch (err) {
          console.error("좋아요 상태 확인 실패", err);
        }
      };
      checkLikeStatus();
    }
  }, [isAuthenticated, id]);

  /**
   * HTML 콘텐츠의 이미지 URL을 현재 프로토콜에 맞게 변환
   * HTTPS 페이지에서 HTTP 이미지를 로드하는 Mixed Content 문제 방지
   * IP 주소를 도메인으로 변환하여 SSL 인증서 경고 방지
   */
  const convertImageUrls = (htmlContent) => {
    if (!htmlContent) return htmlContent;

    const currentOrigin = window.location.origin;
    const currentHost = window.location.host;

    // 현재 페이지가 HTTPS인 경우
    if (window.location.protocol === "https:") {
      // IP 주소를 도메인으로 변환 (13.209.254.24 -> debate.me.kr)
      htmlContent = htmlContent.replace(
        /src="https?:\/\/13\.209\.254\.24(\/[^"]+)"/g,
        `src="https://debate.me.kr$1"`
      );

      // HTTP 이미지 URL을 HTTPS로 변환
      htmlContent = htmlContent.replace(
        /src="http:\/\/([^"]+)"/g,
        'src="https://$1"'
      );

      // 상대 경로 이미지를 절대 경로로 변환 (프로토콜 포함)
      htmlContent = htmlContent.replace(
        /src="(\/[^"]+)"/g,
        `src="${currentOrigin}$1"`
      );
    } else {
      // HTTP 페이지에서도 IP 주소를 도메인으로 변환
      htmlContent = htmlContent.replace(
        /src="https?:\/\/13\.209\.254\.24(\/[^"]+)"/g,
        `src="http://debate.me.kr$1"`
      );

      // 상대 경로를 절대 경로로 변환
      htmlContent = htmlContent.replace(
        /src="(\/[^"]+)"/g,
        `src="${currentOrigin}$1"`
      );
    }

    return htmlContent;
  };

  const fetchData = async () => {
    try {
      if (!debate) setLoading(true);
      setError(null);

      const [debateRes, opinionsRes, bestCommentsRes] = await Promise.all([
        debateService.getDebateById(id),
        opinionService.getOpinionsByDebate(id),
        commentService.getBestCommentsByDebate(id).catch(() => ({ data: [] })),
      ]);

      const debateData = debateRes.data || debateRes;

      // 이미지 URL 변환 (HTTPS 페이지에서 HTTP 이미지 로드 방지)
      if (debateData && debateData.content) {
        debateData.content = convertImageUrls(debateData.content);
      }

      setDebate(debateData);
      setOpinions(opinionsRes.data || opinionsRes || []);
      setBestComments(bestCommentsRes?.data || bestCommentsRes || []);

      // 댓글은 별도 함수로 호출 (페이징/정렬 적용)
      await fetchComments();

      if (isAuthenticated) {
        try {
          const liked = await likeService.isLiked(id);
          setIsLiked(liked.data || liked);
        } catch { }
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // [추가] 댓글 목록 조회 (페이징/정렬)
  const fetchComments = async () => {
    try {
      // 정렬 기준 변환 (프론트 -> 백엔드 Pageable sort)
      let sortParam = "createdAt,desc"; // 기본: 최신순
      if (sort === "oldest") sortParam = "createdAt,asc";
      else if (sort === "replies") sortParam = "replyCount,desc";

      const response = await commentService.getCommentsByDebate(
        id,
        page,
        7,
        sortParam
      ); // 7개씩
      const data = response.data || response;

      setComments(data.content || []);
      setTotalPages(data.totalPages || 0);
    } catch (err) {
      console.error("댓글 로딩 실패:", err);
    }
  };

  // 좋아요 (Optimistic UI 적용)
  const handleLike = async () => {
    if (!isAuthenticated) return alert("로그인이 필요합니다.");

    const prevIsLiked = isLiked;
    const prevLikeCount = debate.likeCount;

    setIsLiked(!prevIsLiked);
    setDebate((prev) => ({
      ...prev,
      likeCount: prevIsLiked ? prev.likeCount - 1 : prev.likeCount + 1,
    }));

    try {
      await likeService.toggleLike(id);
    } catch (err) {
      console.error(err);
      setIsLiked(prevIsLiked);
      setDebate((prev) => ({
        ...prev,
        likeCount: prevLikeCount,
      }));
      alert("좋아요 처리에 실패했습니다.");
    }
  };

  // 삭제
  const handleDelete = async () => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      await debateService.deleteDebate(id);
      navigate("/debate");
    } catch (err) {
      alert(err.response?.data?.message || "삭제 실패");
    }
  };

  // 신고
  const handleReport = async () => {
    if (!isAuthenticated) return alert("로그인이 필요합니다.");
    const reason = prompt("신고 사유를 입력해주세요:");
    if (!reason) return;
    try {
      await reportService.createReport({
        targetType: "DEBATE",
        targetId: parseInt(id),
        reason,
        description: `게시글 신고: ${debate.title}`,
      });
      alert("신고가 접수되었습니다.");
    } catch (err) {
      alert("신고 실패");
    }
    setIsMenuOpen(false);
  };

  // 북마크
  const handleBookmark = () => {
    const bookmarks = JSON.parse(localStorage.getItem('bookmarkedDebates') || '[]');
    const isBookmarked = bookmarks.some(b => b.id === parseInt(id));

    if (isBookmarked) {
      const updated = bookmarks.filter(b => b.id !== parseInt(id));
      localStorage.setItem('bookmarkedDebates', JSON.stringify(updated));
      alert('북마크가 해제되었습니다.');
    } else {
      bookmarks.push({
        id: parseInt(id),
        title: debate.title,
        categoryName: debate.categoryName,
        nickname: debate.nickname,
        profileImage: debate.profileImage, // 프로필 이미지 추가
        createdAt: debate.createdAt,
        bookmarkedAt: new Date().toISOString()
      });
      localStorage.setItem('bookmarkedDebates', JSON.stringify(bookmarks));
      alert('북마크에 추가되었습니다.');
    }
    setIsMenuOpen(false);
  };

  // 작성자 차단
  const handleBlockAuthor = () => {
    if (!debate.userId) {
      alert('작성자 정보를 찾을 수 없습니다.');
      return;
    }
    if (window.confirm(`${debate.nickname}님을 차단하시겠습니까?\n차단된 사용자의 글과 댓글은 표시되지 않습니다.`)) {
      const blockedUsers = JSON.parse(localStorage.getItem('blockedChatUsers') || '[]');
      if (!blockedUsers.some(u => u.id === debate.userId)) {
        blockedUsers.push({
          id: debate.userId,
          nickname: debate.nickname,
          profileImage: debate.profileImage, // 프로필 이미지 추가
          blockedAt: new Date().toISOString()
        });
        localStorage.setItem('blockedChatUsers', JSON.stringify(blockedUsers));
      }
      alert(`${debate.nickname}님이 차단되었습니다.\n차단 해제는 마이페이지 > 차단 관리에서 가능합니다.`);
    }
    setIsMenuOpen(false);
  };

  // 댓글 등록 (Optimistic UI 적용)
  const handleCreateComment = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) return alert("로그인이 필요합니다.");
    if (!commentContent.trim()) return;

    const newComment = {
      id: Date.now(),
      debateId: parseInt(id),
      content: commentContent,
      nickname: user.nickname,
      userId: user.id,
      createdAt: new Date().toISOString(),
      parentId: null,
      replies: [], // 새 댓글은 대댓글 없음
    };

    // 낙관적 업데이트: 최신순일 때만 맨 앞에 추가, 아니면 그냥 리로드
    if (sort === "latest") {
      setComments((prev) => [newComment, ...prev]);
    }
    setCommentContent("");

    // [수정] 댓글 수 즉시 업데이트
    setDebate((prev) => ({
      ...prev,
      commentCount: (prev.commentCount || 0) + 1,
    }));

    try {
      await commentService.createComment({
        debateId: parseInt(id),
        content: newComment.content,
      });
      fetchComments(); // ID 동기화 및 정렬 적용 위해 리로드
    } catch (err) {
      if (sort === "latest") {
        setComments((prev) => prev.filter((c) => c.id !== newComment.id));
      }
      // 실패 시 댓글 수 롤백
      setDebate((prev) => ({
        ...prev,
        commentCount: Math.max(0, (prev.commentCount || 0) - 1),
      }));
      alert("댓글 등록 실패");
    }
  };

  // 대댓글 등록
  const handleCreateReply = async (parentId) => {
    if (!isAuthenticated) return alert("로그인이 필요합니다.");
    if (!replyContent.trim()) return;

    const newReply = {
      id: Date.now(),
      debateId: parseInt(id),
      content: replyContent,
      nickname: user.nickname,
      userId: user.id,
      createdAt: new Date().toISOString(),
      parentId: parentId,
    };

    // 낙관적 업데이트
    setComments((prev) =>
      prev.map((comment) => {
        if (comment.id === parentId) {
          return {
            ...comment,
            replies: [...(comment.replies || []), newReply],
          };
        }
        return comment;
      })
    );
    setReplyContent("");
    setReplyingTo(null);

    try {
      await commentService.createComment({
        debateId: parseInt(id),
        content: newReply.content,
        parentId: parentId,
      });
      fetchComments(); // 리로드
    } catch (err) {
      setComments((prev) =>
        prev.map((comment) => {
          if (comment.id === parentId) {
            return {
              ...comment,
              replies: (comment.replies || []).filter(
                (r) => r.id !== newReply.id
              ),
            };
          }
          return comment;
        })
      );
      alert("답글 등록 실패");
    }
  };

  // [추가] 댓글 좋아요
  const handleCommentLike = async (commentId) => {
    if (!isAuthenticated) return alert("로그인이 필요합니다.");

    // 낙관적 업데이트
    const updateLike = (list) => {
      return list.map((c) => {
        if (c.id === commentId) {
          const wasLiked = c.liked; // [수정] isLiked -> liked
          return {
            ...c,
            liked: !wasLiked, // [수정] isLiked -> liked
            likeCount: wasLiked ? c.likeCount - 1 : c.likeCount + 1,
          };
        }
        if (c.replies && c.replies.length > 0) {
          return { ...c, replies: updateLike(c.replies) };
        }
        return c;
      });
    };

    setComments((prev) => updateLike(prev));

    try {
      await commentService.toggleLike(commentId);
    } catch (err) {
      console.error(err);
      // 실패 시 롤백 (다시 토글)
      setComments((prev) => updateLike(prev));
      alert("좋아요 처리에 실패했습니다.");
    }
  };

  // [추가] 댓글 수정 모드 진입
  const handleEditClick = (comment) => {
    setEditingCommentId(comment.id);
    setEditContent(comment.content);
    setReplyingTo(null); // 답글 작성 중이었다면 취소
  };

  // [추가] 댓글 수정 취소
  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditContent("");
  };

  // [추가] 댓글 수정 저장
  const handleUpdateComment = async (commentId) => {
    if (!editContent.trim()) {
      alert("수정할 댓글 내용을 입력해주세요.");
      return;
    }

    // 낙관적 업데이트
    const updateContent = (list) => {
      return list.map((c) => {
        if (c.id === commentId) {
          return {
            ...c,
            content: editContent,
            updatedAt: new Date().toISOString(),
          };
        }
        if (c.replies && c.replies.length > 0) {
          return { ...c, replies: updateContent(c.replies) };
        }
        return c;
      });
    };

    const prevComments = [...comments];
    setComments((prev) => updateContent(prev));
    handleCancelEdit();

    try {
      await commentService.updateComment(commentId, editContent);
    } catch (err) {
      console.error(err);
      setComments(prevComments); // 롤백
      alert("댓글 수정 실패");
    }
  };

  // [추가] 댓글 삭제
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("댓글을 정말로 삭제하시겠습니까?")) return;

    // 삭제 대상 댓글 찾기 (대댓글 유무 확인)
    const findComment = (list, targetId) => {
      for (const c of list) {
        if (c.id === targetId) return c;
        if (c.replies && c.replies.length > 0) {
          const found = findComment(c.replies, targetId);
          if (found) return found;
        }
      }
      return null;
    };

    const targetComment = findComment(comments, commentId);
    const hasReplies = targetComment && targetComment.replies && targetComment.replies.length > 0;

    // 낙관적 업데이트
    const softDeleteOrRemove = (list) => {
      return list
        .map((c) => {
          // 대상 댓글 처리
          if (c.id === commentId) {
            // 대댓글이 있는 부모 댓글: soft delete (삭제된 댓글입니다로 표시)
            if (hasReplies) {
              return {
                ...c,
                isDeleted: true,
                content: "삭제된 댓글입니다.",
                nickname: "(삭제)",
              };
            }
            // 대댓글이 없는 경우: 완전 삭제 (null 반환 후 filter)
            return null;
          }
          // 대댓글 내부에서 삭제 대상 찾기
          if (c.replies && c.replies.length > 0) {
            return {
              ...c,
              replies: c.replies
                .map((reply) => {
                  if (reply.id === commentId) {
                    // 대댓글 삭제: 완전 삭제
                    return null;
                  }
                  return reply;
                })
                .filter(Boolean),
            };
          }
          return c;
        })
        .filter(Boolean); // null 제거 (완전 삭제된 댓글)
    };

    const prevComments = [...comments];
    setComments((prev) => softDeleteOrRemove(prev));

    // 댓글 수 감소 (화면상)
    setDebate((prev) => ({
      ...prev,
      commentCount: Math.max(0, (prev.commentCount || 0) - 1),
    }));

    try {
      await commentService.deleteComment(commentId);
      alert("댓글이 삭제되었습니다.");
    } catch (err) {
      console.error(err);
      setComments(prevComments); // 롤백
      setDebate((prev) => ({
        ...prev,
        commentCount: (prev.commentCount || 0) + 1,
      }));
      alert("댓글 삭제 실패");
    }
  };

  // 투표 참여
  const handleCreateOpinion = async (side) => {
    if (!isAuthenticated) return alert("로그인이 필요합니다.");
    try {
      await opinionService.createOpinion({
        debateId: parseInt(id),
        side,
        content: null,
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "투표 실패");
    }
  };

  // 목록으로
  const handleBackToList = () => {
    const state = location.state || {};
    navigate("/debate", { state });
  };

  // 베스트 댓글 렌더링 헬퍼
  const renderBestComments = () => {
    if (!bestComments || bestComments.length === 0) return null;

    return (
      <div className="best-comments-wrapper">
        <h4 className="best-comments-title">✨ 베스트 댓글</h4>
        {bestComments.map((comment, index) => {
          const isModified =
            !comment.isDeleted && comment.updatedAt && comment.updatedAt !== comment.createdAt;

          return (
            <div key={`best-${comment.id}`} className="comment-block best-comment-block">
              <div className="comment-row root relative-block">
                <div className="best-badge-ribbon">BEST {index + 1}</div>
                <div className="comment-avatar">
                  <UserAvatar
                    src={comment.profileImage}
                    alt={comment.nickname}
                    size="medium"
                  />
                </div>
                <div className="comment-main">
                  <div className="comment-header">
                    <span className="name">
                      <span
                        className="clickable-nickname"
                        onClick={() => navigate(`/users/${comment.userId}`)}
                      >
                        {comment.nickname}
                      </span>
                    </span>
                    <span className="time">
                      {format(new Date(comment.createdAt), "MM.dd HH:mm")}
                      {isModified && " (수정됨)"}
                    </span>
                  </div>

                  <p
                    className={`comment-text ${comment.isDeleted ? "deleted" : ""}`}
                    style={comment.isDeleted ? { color: "#999", fontStyle: "italic" } : {}}
                  >
                    {comment.content}
                  </p>

                  {!comment.isDeleted && (
                    <div className="comment-actions">
                      <div className="comment-like-btn active" style={{ cursor: "default", opacity: 1 }}>
                        ❤️ {comment.likeCount || 0}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // 댓글 렌더링 헬퍼
  const renderComments = () => {
    if (comments.length === 0) {
      return <div className="no-comments">첫 번째 댓글을 남겨보세요!</div>;
    }

    return comments.map((comment) => {
      const replies = comment.replies || [];
      const isMyComment = user && String(user.id) === String(comment.userId);
      const isEditing = editingCommentId === comment.id;
      // 삭제된 댓글이 아닌 경우에만 (수정됨) 표시
      const isModified =
        !comment.isDeleted && comment.updatedAt && comment.updatedAt !== comment.createdAt;

      return (
        <div key={comment.id} className="comment-block">
          {/* 부모 댓글 */}
          <div className="comment-row root">
            <div className="comment-avatar">
              <UserAvatar
                src={comment.profileImage}
                alt={comment.nickname}
                size="medium"
              />
            </div>
            <div className="comment-main">
              <div className="comment-header">
                <span className="name">
                  <span
                    className="clickable-nickname"
                    onClick={() => navigate(`/users/${comment.userId}`)}
                  >
                    {comment.nickname}
                  </span>
                </span>
                <span className="time">
                  {format(new Date(comment.createdAt), "MM.dd HH:mm")}
                  {isModified && " (수정됨)"}
                </span>
              </div>

              {isEditing ? (
                <div className="edit-form">
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      width: "100%",
                    }}
                  >
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      maxLength={500}
                      autoFocus
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        borderRadius: "8px",
                        border: "1px solid var(--border-color)",
                        resize: "none",
                        minHeight: "60px",
                        marginBottom: "0.5rem",
                      }}
                    />
                    <span
                      className="char-counter"
                      style={{
                        textAlign: "right",
                        fontSize: "0.8rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {editContent.length} / 500
                    </span>
                  </div>
                  <div
                    className="edit-actions"
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      marginTop: "0.5rem",
                    }}
                  >
                    <button
                      onClick={() => handleUpdateComment(comment.id)}
                      style={{
                        padding: "0.4rem 0.8rem",
                        background: "var(--primary-color)",
                        border: "none",
                        borderRadius: "4px",
                        fontWeight: "bold",
                        cursor: "pointer",
                      }}
                    >
                      저장
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      style={{
                        padding: "0.4rem 0.8rem",
                        background: "var(--bg-tertiary)",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p
                    className={`comment-text ${comment.isDeleted ? "deleted" : ""
                      }`}
                    style={
                      comment.isDeleted
                        ? { color: "#999", fontStyle: "italic" }
                        : {}
                    }
                  >
                    {comment.content}
                  </p>
                  {!comment.isDeleted && (
                    <div className="comment-actions">
                      <button
                        className={`comment-like-btn ${comment.liked ? "active" : ""
                          }`}
                        onClick={() => handleCommentLike(comment.id)}
                      >
                        {comment.liked ? "❤️" : "🤍"} {comment.likeCount || 0}
                      </button>
                      <button
                        className="reply-btn"
                        onClick={() =>
                          setReplyingTo(
                            replyingTo === comment.id ? null : comment.id
                          )
                        }
                      >
                        답글 달기
                      </button>
                      {isMyComment && (
                        <>
                          <button
                            className="action-btn"
                            onClick={() => handleEditClick(comment)}
                          >
                            수정
                          </button>
                          <button
                            className="action-btn delete"
                            onClick={() => handleDeleteComment(comment.id)}
                          >
                            삭제
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* 자식 댓글 (답글) */}
          {replies.length > 0 && (
            <div className="replies-container">
              {replies.map((reply) => {
                const isMyReply =
                  user && String(user.id) === String(reply.userId);
                const isReplyEditing = editingCommentId === reply.id;
                // 삭제된 댓글이 아닌 경우에만 (수정됨) 표시
                const isReplyModified =
                  !reply.isDeleted && reply.updatedAt && reply.updatedAt !== reply.createdAt;

                return (
                  <div key={reply.id} className="comment-row reply">
                    <div className="reply-line"></div>
                    <div className="comment-avatar small">
                      <UserAvatar
                        src={reply.profileImage}
                        alt={reply.nickname}
                        size="small"
                      />
                    </div>
                    <div className="comment-main">
                      <div className="comment-header">
                        <span className="name">
                          <span
                            className="clickable-nickname"
                            onClick={() => navigate(`/users/${reply.userId}`)}
                          >
                            {reply.nickname}
                          </span>
                        </span>
                        <span className="time">
                          {format(new Date(reply.createdAt), "MM.dd HH:mm")}
                          {isReplyModified && " (수정됨)"}
                        </span>
                      </div>

                      {isReplyEditing ? (
                        <div className="edit-form">
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              width: "100%",
                            }}
                          >
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              maxLength={500}
                              autoFocus
                              style={{
                                width: "100%",
                                padding: "0.5rem",
                                borderRadius: "8px",
                                border: "1px solid var(--border-color)",
                                resize: "none",
                                minHeight: "60px",
                                marginBottom: "0.5rem",
                              }}
                            />
                            <span
                              className="char-counter"
                              style={{
                                textAlign: "right",
                                fontSize: "0.8rem",
                                color: "var(--text-secondary)",
                              }}
                            >
                              {editContent.length} / 500
                            </span>
                          </div>
                          <div
                            className="edit-actions"
                            style={{
                              display: "flex",
                              gap: "0.5rem",
                              marginTop: "0.5rem",
                            }}
                          >
                            <button
                              onClick={() => handleUpdateComment(reply.id)}
                              style={{
                                padding: "0.4rem 0.8rem",
                                background: "var(--primary-color)",
                                border: "none",
                                borderRadius: "4px",
                                fontWeight: "bold",
                                cursor: "pointer",
                              }}
                            >
                              저장
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              style={{
                                padding: "0.4rem 0.8rem",
                                background: "var(--bg-tertiary)",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                              }}
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p
                            className={`comment-text ${reply.isDeleted ? "deleted" : ""
                              }`}
                            style={
                              reply.isDeleted
                                ? { color: "#999", fontStyle: "italic" }
                                : {}
                            }
                          >
                            {reply.content}
                          </p>
                          {!reply.isDeleted && (
                            <div className="comment-actions">
                              <button
                                className={`comment-like-btn ${reply.liked ? "active" : ""
                                  }`}
                                onClick={() => handleCommentLike(reply.id)}
                              >
                                {reply.liked ? "❤️" : "🤍"}{" "}
                                {reply.likeCount || 0}
                              </button>
                              {isMyReply && (
                                <>
                                  <button
                                    className="action-btn"
                                    onClick={() => handleEditClick(reply)}
                                  >
                                    수정
                                  </button>
                                  <button
                                    className="action-btn delete"
                                    onClick={() =>
                                      handleDeleteComment(reply.id)
                                    }
                                  >
                                    삭제
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 답글 입력 폼 */}
          {replyingTo === comment.id && (
            <div className="reply-form-container">
              <div className="reply-line"></div>
              <div className="reply-form">
                <div
                  style={{ display: "flex", flexDirection: "column", flex: 1 }}
                >
                  <input
                    type="text"
                    placeholder="답글을 입력하세요..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    maxLength={500}
                    autoFocus
                  />
                  <span className="char-counter">
                    {replyContent.length} / 500
                  </span>
                </div>
                <button onClick={() => handleCreateReply(comment.id)}>
                  등록
                </button>
              </div>
            </div>
          )}
        </div>
      );
    });
  };

  if (loading && !debate)
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  if (error || !debate) return <div className="error-msg">{error}</div>;

  const isOwner = user && String(user.id) === String(debate.userId);
  const canEdit = isOwner && debate.status === "SCHEDULED";

  // 투표 집계
  const forCount = opinions.filter((o) => o.side === "FOR").length;
  const againstCount = opinions.filter((o) => o.side === "AGAINST").length;
  const totalCount = forCount + againstCount;
  const forPercent =
    totalCount > 0 ? Math.round((forCount / totalCount) * 100) : 0;
  const againstPercent =
    totalCount > 0 ? Math.round((againstCount / totalCount) * 100) : 0;

  return (
    <div className="debate-detail-page">
      <div className="animated-bg"></div>

      <div className="container">
        <article className="debate-article">
          <div className="article-top-bar">
            <div className="top-left">
              <span className="badge category-badge">
                {debate.categoryName}
              </span>
              <span
                className={`badge status-badge ${debate.status?.toLowerCase()}`}
              >
                {debate.status === "ACTIVE"
                  ? "진행중"
                  : debate.status === "ENDED"
                    ? "종료됨"
                    : "예정"}
              </span>
            </div>

            <div className="top-right" ref={menuRef}>
              {isOwner ? (
                <div className="menu-wrapper">
                  <button
                    className="icon-btn"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                  >
                    ⋮
                  </button>
                  {isMenuOpen && (
                    <div className="dropdown-menu">
                      <button
                        onClick={() => {
                          if (canEdit) {
                            navigate(`/debate/${id}/edit`);
                          } else {
                            // 수정 불가 이유 표시
                            if (debate.status === "ACTIVE") {
                              alert("진행중인 토론은 수정할 수 없습니다.\n토론이 시작되기 전(예정 상태)에만 수정이 가능합니다.");
                            } else if (debate.status === "ENDED") {
                              alert("종료된 토론은 수정할 수 없습니다.");
                            }
                          }
                        }}
                      >
                        수정하기
                      </button>
                      <button onClick={handleDelete} className="delete-btn">
                        삭제하기
                      </button>
                    </div>
                  )}
                </div>
              ) : isAuthenticated ? (
                <div className="menu-wrapper">
                  <button
                    className="icon-btn"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                  >
                    ⋮
                  </button>
                  {isMenuOpen && (
                    <div className="dropdown-menu">
                      <button onClick={handleBookmark}>
                        🔖 북마크
                      </button>
                      <button onClick={handleBlockAuthor}>
                        🚫 차단하기
                      </button>
                      <button onClick={handleReport} className="delete-btn">
                        🚨 신고하기
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <h1 className="article-title">{debate.title}</h1>

          <div className="article-meta">
            <div className="meta-left">
              <UserAvatar
                src={debate.profileImage}
                alt={debate.nickname}
                size="small"
                className="author-avatar"
              />
              <span
                className="author-name clickable-nickname"
                onClick={() => navigate(`/users/${debate.userId}`)}
              >
                {debate.nickname}
              </span>
              <span className="separator">·</span>
              <span className="date">
                {format(new Date(debate.createdAt), "yyyy.MM.dd")}
              </span>
            </div>
            <div className="meta-right">
              <span>조회 {debate.viewCount?.toLocaleString()}</span>
              <span>댓글 {debate.commentCount?.toLocaleString()}</span>
            </div>
          </div>

          <div
            className="article-content ql-editor"
            dangerouslySetInnerHTML={{ __html: debate.content }}
          />

          <div className="article-footer">
            <button
              className={`like-btn ${isLiked ? "active" : ""}`}
              onClick={handleLike}
            >
              👍 좋아요 {debate.likeCount}
            </button>
            <button className="list-btn" onClick={handleBackToList}>
              목록으로
            </button>
          </div>
        </article>

        {debate.status === "ACTIVE" && (
          <section className="vote-section">
            <div className="vote-header">
              <h3>투표 현황</h3>
              <p>당신의 의견을 선택해주세요</p>
            </div>

            <div className="vote-container">
              {/* 찬성 측 */}
              <div className="vote-card for">
                <div className="card-bg"></div>
                <div className="card-content">
                  <span className="side-label">AGREE</span>
                  <h4 className="side-title">찬성</h4>
                  <div className="vote-stats">
                    <span className="percent">{forPercent}%</span>
                    <span className="count">{forCount}명</span>
                  </div>
                  <div className="progress-container">
                    <div
                      className="progress-fill"
                      style={{ "--percent": `${forPercent}%` }}
                    ></div>
                  </div>
                  <button
                    className="vote-action-btn"
                    onClick={() => handleCreateOpinion("FOR")}
                  >
                    찬성 투표
                  </button>
                </div>
              </div>

              {/* VS 배지 */}
              <div className="vs-badge">
                <span>VS</span>
              </div>

              {/* 반대 측 */}
              <div className="vote-card against">
                <div className="card-bg"></div>
                <div className="card-content">
                  <span className="side-label">DISAGREE</span>
                  <h4 className="side-title">반대</h4>
                  <div className="vote-stats">
                    <span className="percent">{againstPercent}%</span>
                    <span className="count">{againstCount}명</span>
                  </div>
                  <div className="progress-container">
                    <div
                      className="progress-fill"
                      style={{ "--percent": `${againstPercent}%` }}
                    ></div>
                  </div>
                  <button
                    className="vote-action-btn"
                    onClick={() => handleCreateOpinion("AGAINST")}
                  >
                    반대 투표
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="comment-section">
          <div className="comment-header-row">
            <h3 className="section-header">
              댓글 <span className="count">{debate.commentCount}</span>
            </h3>

            {/* [추가] 정렬 탭 */}
            <div className="sort-tabs">
              <button
                className={sort === "latest" ? "active" : ""}
                onClick={() => setSort("latest")}
              >
                최신순
              </button>
              <button
                className={sort === "oldest" ? "active" : ""}
                onClick={() => setSort("oldest")}
              >
                오래된순
              </button>
              <button
                className={sort === "replies" ? "active" : ""}
                onClick={() => setSort("replies")}
              >
                답글순
              </button>
            </div>
          </div>

          <form className="comment-input-area" onSubmit={handleCreateComment}>
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <textarea
                placeholder={
                  isAuthenticated
                    ? "의견을 남겨주세요."
                    : "로그인이 필요합니다."
                }
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                disabled={!isAuthenticated}
                maxLength={500}
              />
              <span className="char-counter">
                {commentContent.length} / 500
              </span>
            </div>
            <button
              type="submit"
              disabled={!isAuthenticated || !commentContent.trim()}
            >
              등록
            </button>
          </form>

          {renderBestComments()}
          <div className="comment-list">{renderComments()}</div>

          {/* [추가] 페이지네이션 */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                &lt;
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  className={page === i ? "active" : ""}
                  onClick={() => setPage(i)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={page === totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                &gt;
              </button>
            </div>
          )}
        </section>
      </div>

      {/* 실시간 채팅 위젯 */}
      <ChatWidget
        debateId={parseInt(id)}
        debateTitle={debate ? debate.title : ""}
      />
    </div>
  );
};
export default DebateDetailPage;
