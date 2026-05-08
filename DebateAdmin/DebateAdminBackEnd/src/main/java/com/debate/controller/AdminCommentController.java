package com.debate.controller;

import com.debate.dto.response.ApiResponse;
import com.debate.dto.response.CommentResponse;
import com.debate.entity.Comment;
import com.debate.service.AdminCommentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 관리자 댓글 운영을 위한 REST 컨트롤러.
 * <p>
 * 신고/운영 대상 댓글을 검색하고 숨김 처리하거나 삭제하는 액션을 제공한다.
 */
@Tag(name = "관리자 댓글 관리 API", description = "댓글 조회, 삭제, 숨김 처리 등 댓글 관리 API")
@RestController
@RequestMapping("/api/admin/comments")
@RequiredArgsConstructor
public class AdminCommentController {
    private final AdminCommentService adminCommentService;

    /**
     * 특정 토론의 댓글을 페이지 조회한다. (숨김 댓글 포함)
     *
     * @param debateId 토론 ID
     * @param page     페이지 번호
     * @param size     페이지 크기
     * @param sort     정렬 기준 (예: "createdAt,desc")
     * @return 댓글 응답 페이지 wrapped ApiResponse
     */
    @Operation(summary = "토론별 댓글 조회", description = "특정 토론의 댓글 목록을 조회합니다. 숨김 댓글도 포함됩니다.")
    @GetMapping("/debate/{debateId}")
    public ResponseEntity<ApiResponse<Page<CommentResponse>>> getCommentsByDebate(
            @PathVariable Long debateId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort) {
        // 정렬 파라미터 파싱
        String[] sortParams = sort.split(",");
        String sortBy = sortParams[0];
        Sort.Direction direction = sortParams.length > 1 && "asc".equalsIgnoreCase(sortParams[1])
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));

        Page<CommentResponse> comments = adminCommentService.getCommentsByDebate(debateId, pageable);
        return ResponseEntity.ok(ApiResponse.success(comments));
    }

    /**
     * 키워드 및 숨김 여부 조건으로 댓글을 페이지 조회한다.
     *
     * @param keyword  댓글 내용 검색어
     * @param isHidden 숨김 여부 필터
     * @param page     페이지 번호
     * @param size     페이지 크기
     * @return 댓글 페이지 wrapped ApiResponse
     */
    @Operation(summary = "댓글 목록 조회", description = "검색 조건에 따라 댓글 목록을 조회합니다. 최신순으로 정렬됩니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<CommentResponse>>> getComments(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean isHidden,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        // 최신순으로 정렬 (createdAt 내림차순)
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<CommentResponse> comments = adminCommentService.searchComments(keyword, isHidden, pageable);
        return ResponseEntity.ok(ApiResponse.success(comments));
    }

    /**
     * 특정 댓글을 조회한다.
     *
     * @param id 댓글 ID
     * @return 댓글 엔티티 wrapped ApiResponse
     */
    @Operation(summary = "댓글 상세 조회", description = "댓글의 상세 정보를 조회합니다.")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CommentResponse>> getCommentDetail(@PathVariable Long id) {
        CommentResponse commentResponse = adminCommentService.getCommentById(id);
        return ResponseEntity.ok(ApiResponse.success(commentResponse));
    }

    /**
     * 댓글의 숨김 플래그를 토글한다.
     *
     * @param id 댓글 ID
     * @return 토글된 댓글 wrapped ApiResponse
     */
    @Operation(summary = "댓글 숨김 처리", description = "댓글의 숨김 상태를 토글합니다.")
    @PutMapping("/{id}/toggle-hidden")
    public ResponseEntity<ApiResponse<CommentResponse>> toggleCommentHidden(@PathVariable Long id) {
        CommentResponse commentResponse = adminCommentService.toggleCommentHidden(id);
        return ResponseEntity.ok(ApiResponse.success("댓글 숨김 상태가 변경되었습니다", commentResponse));
    }

    /**
     * 댓글을 삭제한다.
     *
     * @param id 댓글 ID
     * @return 성공 메시지 응답
     */
    @Operation(summary = "댓글 삭제", description = "댓글을 삭제합니다.")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(@PathVariable Long id) {
        adminCommentService.deleteComment(id);
        return ResponseEntity.ok(ApiResponse.success("댓글이 삭제되었습니다", null));
    }
}
