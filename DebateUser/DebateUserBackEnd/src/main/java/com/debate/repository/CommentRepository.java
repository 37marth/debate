package com.debate.repository;

import com.debate.entity.Debate;
import com.debate.entity.Comment;
import com.debate.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {
    Page<Comment> findByDebateAndIsHiddenFalseAndParentIsNull(Debate debate, Pageable pageable);

    List<Comment> findByParent(Comment parent);

    List<Comment> findByUser(User user);

    Page<Comment> findByUserAndIsHiddenFalse(User user, Pageable pageable);

    long countByDebateAndIsHiddenFalse(Debate debate);

    List<Comment> findTop3ByDebateAndIsDeletedFalseAndIsHiddenFalseAndParentIsNullOrderByLikeCountDesc(Debate debate);
    //findTop3: 최상위 3개만 찾아라
    //
    //ByDebate: 특정 토론 게시글 안에서
    //
    //AndIsDeletedFalse: 그리고 (소프트) 삭제 처리가 되지 않았으며
    //
    //AndIsHiddenFalse: 그리고 관리자에 의해 숨김 처리되지 않았고
    //
    //AndParentIsNull: 그리고 부모 댓글이 없는 (즉, 대댓글이 아닌 원본 댓글 중에서)
    //
    //OrderByLikeCountDesc: 좋아요 수(likeCount)가 가장 많은 순서대로(내림차순) 정렬해서.
}
