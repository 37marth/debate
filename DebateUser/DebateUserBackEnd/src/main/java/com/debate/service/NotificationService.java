package com.debate.service;

import com.debate.entity.Notification;
import com.debate.entity.User;
import com.debate.repository.NotificationRepository;
import com.debate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    // 알림 생성
    public void createNotification(User receiver, String content, String type, String relatedUrl) {
        Notification notification = Notification.builder()
                .user(receiver)
                .content(content)
                .type(type)
                .relatedUrl(relatedUrl)
                .isRead(false)
                .build();
        
        notificationRepository.save(notification);
    }

    // 내 알림 목록 조회
    @Transactional(readOnly = true)
    public Map<String, Object> getMyNotifications(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        // 최근 20개만 조회
        Page<Notification> page = notificationRepository.findByUserOrderByCreatedAtDesc(
                user, PageRequest.of(0, 20));
        
        long unreadCount = notificationRepository.countByUserAndIsReadFalse(user);

        List<Map<String, Object>> notificationList = page.getContent().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("notifications", notificationList);
        result.put("unreadCount", unreadCount);

        return result;
    }

    // 안 읽은 알림 개수 조회
    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        return notificationRepository.countByUserAndIsReadFalse(user);
    }

    // 알림 읽음 처리
    public void readNotification(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("알림을 찾을 수 없습니다."));

        if (!notification.getUser().getId().equals(userId)) {
            throw new RuntimeException("권한이 없습니다.");
        }

        notification.setRead(true);
        notificationRepository.save(notification);
    }

    // 모든 알림 읽음 처리
    public void readAllNotifications(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        
        notificationRepository.markAllAsRead(user);
    }

    private Map<String, Object> convertToDto(Notification notification) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", notification.getId());
        dto.put("message", notification.getContent());
        dto.put("type", notification.getType().toLowerCase());
        dto.put("url", notification.getRelatedUrl());
        dto.put("isRead", notification.isRead());
        dto.put("time", formatTime(notification.getCreatedAt()));
        return dto;
    }

    private String formatTime(java.time.LocalDateTime time) {
        // 간단한 시간 포맷팅 (예: 방금 전, 1분 전 등은 프론트엔드에서 처리하거나 여기서 로직 추가)
        return time.toString(); 
    }
}
