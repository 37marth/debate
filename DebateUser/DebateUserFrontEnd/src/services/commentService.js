/**
 * 댓글 서비스 (Comment Service)
 * 
 * 댓글 관련 API 호출을 담당하는 서비스입니다.
 * 
 * 주요 기능:
 * - 토론별 댓글 목록 조회 (페이징)
 * - 댓글 작성
 * - 댓글 삭제
 */

import api from './api'

export const commentService = {
  /**
   * 토론별 댓글 목록 조회
   * 
   * 특정 토론의 댓글 목록을 페이징하여 가져옵니다.
   * 
   * @param {number} debateId - 토론 ID
   * @param {number} page - 페이지 번호 (0부터 시작)
   * @param {number} size - 페이지당 항목 수
   * @returns {Promise<Object>} ApiResponse 구조의 응답 데이터
   * @returns {Object} response.data - Page<CommentResponse> (페이징된 댓글 목록)
   */
  async getCommentsByDebate(debateId, page = 0, size = 20, sort = 'createdAt,desc') {
    const response = await api.get(`/comments/debate/${debateId}`, {
      params: { page, size, sort },
    })
    return response.data
  },
  /**
   * 베스트 댓글 목록 조회
   * * 특정 토론의 베스트 댓글 상위 3개를 가져옵니다.
   * * @param {number} debateId - 토론 ID
   * @returns {Promise<Object>} ApiResponse 구조의 응답 데이터
   */
  async getBestCommentsByDebate(debateId) {
    const response = await api.get(`/comments/debate/${debateId}/best`)
    return response.data
  },

  /**
   * 댓글 작성
   * 
   * 새로운 댓글을 작성합니다. 인증이 필요합니다.
   * 
   * @param {Object} commentData - 댓글 작성 데이터
   * @param {number} commentData.debateId - 토론 ID
   * @param {string} commentData.content - 댓글 내용
   * @param {number} [commentData.parentId] - 부모 댓글 ID (대댓글인 경우)
   * @returns {Promise<Object>} ApiResponse 구조의 응답 데이터
   * @returns {Object} response.data - CommentResponse (작성된 댓글 정보)
   */
  async createComment(commentData) {
    const response = await api.post('/comments', commentData)
    return response.data
  },

  /**
   * 댓글 삭제
   * 
   * 댓글을 삭제합니다. 작성자만 삭제 가능합니다.
   * 
   * @param {number} id - 삭제할 댓글 ID
   * @returns {Promise<Object>} ApiResponse 구조의 응답 데이터
   */
  async deleteComment(id) {
    const response = await api.delete(`/comments/${id}`)
    return response.data
  },

  /**
   * 댓글 수정
   * 
   * 댓글을 수정합니다. 작성자만 수정 가능합니다.
   * 
   * @param {number} id - 수정할 댓글 ID
   * @param {string} content - 수정할 내용
   * @returns {Promise<Object>} ApiResponse 구조의 응답 데이터
   */
  async updateComment(id, content) {
    const response = await api.put(`/comments/${id}`, { content })
    return response.data
  },

  /**
   * 댓글 좋아요 토글
   * 
   * 댓글에 좋아요를 누르거나 취소합니다.
   * 
   * @param {number} id - 댓글 ID
   * @returns {Promise<Object>} ApiResponse 구조의 응답 데이터
   */
  async toggleLike(id) {
    const response = await api.post(`/comments/${id}/like`)
    return response.data
  },
}

