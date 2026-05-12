package com.debate.dto.response;

import com.debate.entity.Comment;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentResponse {
    private Long id;
    private Long userId;
    private String nickname;
    private String profileImage; // 프로필 이미지 필드 추가
    private Long debateId;
    private Long parentId;
    private String content;
    private Boolean isHidden;
    private Boolean isDeleted;
    private List<CommentResponse> replies;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private int likeCount;
    private boolean liked;

    /**
     * 프로필 이미지 URL 경로 변환
     * 기존 /files/editor/images/ 경로를 /files/user/profile/ 경로로 변환
     */
    private static String normalizeProfileImageUrl(String profileImage) {
        if (profileImage == null || profileImage.isEmpty()) {
            return profileImage;
        }
        // 기존 경로를 새 경로로 변환
        if (profileImage.startsWith("/files/editor/images/")) {
            return profileImage.replace("/files/editor/images/", "/files/user/profile/");
        }
        return profileImage;
    }

    public static CommentResponse from(Comment comment) {
        boolean deleted = comment.getIsDeleted() != null && comment.getIsDeleted();

        return CommentResponse.builder()
                .id(comment.getId())
                .userId(deleted ? null : comment.getUser().getId())
                .nickname(deleted ? "(삭제)" : comment.getUser().getNickname())
                .profileImage(deleted ? null : normalizeProfileImageUrl(comment.getUser().getProfileImage())) // 프로필 이미지
                                                                                                              // 추가
                .debateId(comment.getDebate().getId())
                .parentId(comment.getParent() != null ? comment.getParent().getId() : null)
                .content(deleted ? "삭제된 댓글입니다." : comment.getContent())
                .isHidden(comment.getIsHidden())
                .isDeleted(deleted)
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .likeCount(comment.getLikeCount())
                .build();
    }
}
