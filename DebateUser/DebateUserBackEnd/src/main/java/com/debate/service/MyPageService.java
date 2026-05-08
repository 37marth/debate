package com.debate.service;

import com.debate.dto.response.DebateResponse;
import com.debate.dto.response.CommentResponse;
import com.debate.dto.response.DebateOpinionResponse;
import com.debate.entity.User;
import com.debate.repository.DebateOpinionRepository;
import com.debate.repository.DebateRepository;
import com.debate.repository.CommentRepository;
import com.debate.repository.LikeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 마이페이지 관련 비즈니스 로직을 처리하는 서비스 클래스
 * 현재 로그인한 사용자의 마이페이지 데이터를 제공합니다.
 */
@Service
@RequiredArgsConstructor
public class MyPageService {
    private final DebateRepository debateRepository;
    private final CommentRepository commentRepository;
    private final DebateOpinionRepository debateOpinionRepository;
    private final LikeRepository likeRepository;

    /**
     * 내 토론 목록 조회 (페이징)
     * 현재 로그인한 사용자가 작성한 토론 목록을 조회합니다.
     * 
     * @param userId 사용자 ID
     * @param pageable 페이징 정보
     * @return 사용자가 작성한 토론 목록 (좋아요 수, 댓글 수 포함)
     */
    public Page<DebateResponse> getMyDebates(Long userId, Pageable pageable) {
        User user = new User();
        user.setId(userId);
        
        return debateRepository.findByUserAndIsHiddenFalse(user, pageable)
                .map(debate -> {
                    Long likeCount = likeRepository.countByDebate(debate);
                    Long commentCount = commentRepository.countByDebateAndIsHiddenFalse(debate);
                    return DebateResponse.from(debate, likeCount, commentCount);
                });
    }

    /**
     * 내 댓글 목록 조회 (페이징)
     * 현재 로그인한 사용자가 작성한 댓글 목록을 조회합니다.
     * 
     * @param userId 사용자 ID
     * @param pageable 페이징 정보
     * @return 사용자가 작성한 댓글 목록
     */
    public Page<CommentResponse> getMyComments(Long userId, Pageable pageable) {
        User user = new User();
        user.setId(userId);
        
        List<CommentResponse> comments = commentRepository.findByUser(user)
                .stream()
                .map(CommentResponse::from)
                .collect(Collectors.toList());
        
        // 페이징 처리
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), comments.size());
        List<CommentResponse> pagedComments = comments.subList(start, end);
        
        return new org.springframework.data.domain.PageImpl<>(
            pagedComments,
            pageable,
            comments.size()
        );
    }

    /**
     * 참여한 토론 목록 조회 (내 의견 목록)
     * 현재 로그인한 사용자가 입장을 선택한 토론 목록을 조회합니다.
     * 
     * @param userId 사용자 ID
     * @return 사용자가 선택한 의견 목록 (debateId 포함)
     */
    public List<DebateOpinionResponse> getMyOpinions(Long userId) {
        User user = new User();
        user.setId(userId);
        
        return debateOpinionRepository.findByUser(user)
                .stream()
                .map(DebateOpinionResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * 받은 좋아요 목록 조회 (페이징)
     * 현재 로그인한 사용자가 작성한 토론 중 좋아요를 받은 토론 목록을 좋아요 수가 많은 순으로 조회합니다.
     * 
     * @param userId 사용자 ID
     * @param pageable 페이징 정보
     * @return 사용자가 작성한 토론 목록 (좋아요 수가 많은 순, 좋아요 수, 댓글 수 포함)
     */
    public Page<DebateResponse> getMyLikedDebates(Long userId, Pageable pageable) {
        User user = new User();
        user.setId(userId);
        
        // 사용자가 작성한 모든 토론 가져오기
        List<DebateResponse> allDebates = debateRepository.findByUserAndIsHiddenFalse(user, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt"))
                .stream()
                .map(debate -> {
                    Long likeCount = likeRepository.countByDebate(debate);
                    Long commentCount = commentRepository.countByDebateAndIsHiddenFalse(debate);
                    return DebateResponse.from(debate, likeCount, commentCount);
                })
                .filter(debate -> debate.getLikeCount() > 0) // 좋아요가 1개 이상인 것만
                .sorted((a, b) -> Long.compare(b.getLikeCount(), a.getLikeCount())) // 좋아요 수가 많은 순으로 정렬
                .collect(Collectors.toList());
        
        // 페이징 처리
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), allDebates.size());
        List<DebateResponse> pagedDebates = allDebates.subList(start, end);
        
        return new org.springframework.data.domain.PageImpl<>(
            pagedDebates,
            pageable,
            allDebates.size()
        );
    }
}

