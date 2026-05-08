package com.debate.service;

import com.debate.dto.response.UserRankingResponse;
import com.debate.dto.response.UserResponse;
import com.debate.entity.User;
import com.debate.exception.ResourceNotFoundException;
import com.debate.repository.DebateOpinionRepository;
import com.debate.repository.DebateRepository;
import com.debate.repository.CommentRepository;
import com.debate.repository.LikeRepository;
import com.debate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final DebateRepository debateRepository;
    private final CommentRepository commentRepository;
    private final LikeRepository likeRepository;
    private final DebateOpinionRepository debateOpinionRepository;

    /**
     * 받은 좋아요 수 기준 사용자 랭킹 조회
     *
     * @param limit 조회할 상위 사용자 수
     * @return 사용자 랭킹 목록
     */
    /**
     * 사용자 랭킹 조회 (기간 및 기준별)
     *
     * @param period   기간 (daily, monthly, yearly, all)
     * @param criteria 기준 (likes, votes, comments)
     * @param limit    조회할 상위 사용자 수
     * @return 사용자 랭킹 목록
     */
    public List<UserRankingResponse> getUserRanking(String period, String criteria, int limit) {
        java.time.LocalDateTime end = java.time.LocalDateTime.now();
        java.time.LocalDateTime start = calculateStartDate(period, end);
        Pageable pageable = org.springframework.data.domain.PageRequest.of(0, limit);

        List<UserRankingResponse> ranking;

        switch (criteria.toLowerCase()) {
            case "votes": // 투표율 (의견 수)
                ranking = userRepository.findRankingByDebateOpinions(start, end, pageable);
                break;
            case "comments": // 댓글 좋아요
                ranking = userRepository.findRankingByCommentLikes(start, end, pageable);
                break;
            case "likes": // 토론 좋아요 (기본값)
            default:
                ranking = userRepository.findRankingByDebateLikes(start, end, pageable);
                break;
        }

        // 순위 부여
        for (int i = 0; i < ranking.size(); i++) {
            ranking.get(i).setRank((long) (i + 1));
        }

        return ranking;
    }

    private java.time.LocalDateTime calculateStartDate(String period, java.time.LocalDateTime end) {
        switch (period.toLowerCase()) {
            case "daily":
                return java.time.LocalDate.now().atStartOfDay();
            case "monthly":
                return java.time.LocalDate.now().withDayOfMonth(1).atStartOfDay();
            case "yearly":
                return java.time.LocalDate.now().withDayOfYear(1).atStartOfDay();
            case "all":
            default:
                return java.time.LocalDateTime.of(2000, 1, 1, 0, 0);
        }
    }

    /**
     * (Deprecated) 기존 메서드 유지 - 하위 호환성
     */
    public List<UserRankingResponse> getUserRanking(int limit) {
        return getUserRanking("all", "likes", limit);
    }

    public UserResponse getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다"));

        // 통계 정보 계산
        long debateCount = debateRepository.findByUserAndIsHiddenFalse(user, Pageable.unpaged()).getTotalElements();
        long commentCount = commentRepository.findByUser(user).size();

        // 받은 좋아요 수: 사용자가 작성한 토론들에 받은 좋아요 총합
        long likeCount = debateRepository.findByUserAndIsHiddenFalse(user, Pageable.unpaged())
                .getContent()
                .stream()
                .mapToLong(debate -> likeRepository.countByDebate(debate))
                .sum();

        // 참여한 토론 수: 입장을 선택한 토론 수
        long participatedCount = debateOpinionRepository.findByUser(user).size();

        return UserResponse.from(user, debateCount, commentCount, likeCount, participatedCount);
    }

    @Transactional
    public UserResponse updateProfile(Long userId, String nickname, String bio, String profileImage) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다"));

        if (nickname != null && !nickname.isEmpty()) {
            user.setNickname(nickname);
        }
        if (bio != null) {
            user.setBio(bio);
        }
        if (profileImage != null) {
            user.setProfileImage(profileImage);
        }

        user = userRepository.save(user);
        return UserResponse.from(user);
    }

    public User getUserEntity(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다"));
    }

    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다: " + email));
    }

    /**
     * 특정 사용자가 작성한 토론 목록 조회 (페이징)
     *
     * @param userId   사용자 ID
     * @param pageable 페이징 정보
     * @return 사용자가 작성한 토론 목록
     */
    public org.springframework.data.domain.Page<com.debate.dto.response.DebateResponse> getUserDebates(Long userId,
            Pageable pageable) {
        User user = getUserEntity(userId);

        return debateRepository.findByUserAndIsHiddenFalse(user, pageable)
                .map(debate -> {
                    long likeCount = likeRepository.countByDebate(debate);
                    long commentCount = commentRepository.countByDebateAndIsHiddenFalse(debate);
                    return com.debate.dto.response.DebateResponse.from(debate, likeCount, commentCount);
                });
    }

    /**
     * 특정 사용자가 작성한 댓글 목록 조회 (페이징)
     *
     * @param userId   사용자 ID
     * @param pageable 페이징 정보
     * @return 사용자가 작성한 댓글 목록
     */
    public org.springframework.data.domain.Page<com.debate.dto.response.CommentResponse> getUserComments(Long userId,
            Pageable pageable) {
        User user = getUserEntity(userId);

        return commentRepository.findByUserAndIsHiddenFalse(user, pageable)
                .map(com.debate.dto.response.CommentResponse::from);
    }

}
