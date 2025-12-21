# 이미지 업로드 및 표시 문제 해결 가이드

## 문제 상황

- 로컬에서는 이미지가 정상적으로 업로드되고 표시됨
- 실서버(도메인 + SSL)에서는 업로드는 되지만 에디터와 토론 상세에서 이미지가 보이지 않음
- 기존 IP(13.209.254.24)에서는 정상 작동했으나, 도메인(debate.me.kr)과 SSL(https) 추가 후 문제 발생

## 원인 분석

### 1. Nginx HTTPS 설정 누락

- HTTPS 서버 블록에 `/files` 경로가 없어서 이미지 파일에 접근할 수 없음
- HTTP에서 HTTPS로 리다이렉트되면서 이미지 경로가 제대로 처리되지 않음

### 2. Mixed Content 문제

- HTTPS 페이지에서 HTTP 이미지를 로드하려고 하면 브라우저가 차단함
- 백엔드에서 반환하는 이미지 URL이 상대 경로(`/files/editor/images/...`)로 되어 있어서 프로토콜 불일치 발생

### 3. 이미지 URL 처리 로직 부족

- 프론트엔드에서 이미지 URL을 절대 경로로 변환할 때 프로토콜 일치 확인이 없음
- 토론 상세 페이지에서 HTML 콘텐츠의 이미지 URL 변환이 없음

## 해결 방법

### 1. Nginx 설정 수정

**파일**: `/etc/nginx/sites-available/debate` 또는 서버의 실제 Nginx 설정 파일

**HTTPS 서버 블록에 `/files` 경로 추가**:

```nginx
# HTTPS - 사용자 서버
server {
    listen 443 ssl http2;
    server_name debate.me.kr www.debate.me.kr;

    ssl_certificate /etc/letsencrypt/live/debate.me.kr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/debate.me.kr/privkey.pem;

    # ... SSL 설정 ...

    root /home/ubuntu/opt/debate/frontend;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 요청을 백엔드로 프록시
    location /api {
        proxy_pass http://localhost:9001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # ⭐ 파일 업로드 경로 프록시 추가 (중요!)
    location /files {
        proxy_pass http://localhost:9001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 이미지 파일 캐싱 설정
        proxy_cache_valid 200 1d;
        add_header Cache-Control "public, max-age=86400";
    }

    # 정적 파일 캐싱
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**관리자 서버에도 동일하게 추가**:

```nginx
# HTTPS - 관리자 서버
server {
    listen 443 ssl http2;
    server_name admin.debate.me.kr;

    # ... 동일한 설정 ...

    # ⭐ /files 경로 추가
    location /files {
        proxy_pass http://localhost:9001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache_valid 200 1d;
        add_header Cache-Control "public, max-age=86400";
    }
}
```

**Nginx 설정 적용**:

```bash
# 설정 파일 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx

# 상태 확인
sudo systemctl status nginx
```

### 2. 프론트엔드 코드 수정

이미 다음 파일들이 수정되었습니다:

- `DebateUser/DebateUserFrontEnd/src/pages/DebateCreatePage.jsx`
- `DebateUser/DebateUserFrontEnd/src/pages/DebateEditPage.jsx`
- `DebateUser/DebateUserFrontEnd/src/pages/DebateDetailPage.jsx`

**주요 변경사항**:

- 이미지 URL을 절대 경로로 변환할 때 프로토콜 일치 확인
- HTTP URL을 HTTPS로 자동 변환 (Mixed Content 방지)
- 토론 상세 페이지에서 HTML 콘텐츠의 이미지 URL 변환

### 3. 배포 및 확인

**프론트엔드 재배포**:

```bash
# 프론트엔드 빌드
cd DebateUser/DebateUserFrontEnd
npm run build

# 서버에 배포 (기존 배포 스크립트 사용)
# 또는 수동으로 dist 폴더를 서버에 업로드
```

**확인 사항**:

1. **브라우저 개발자 도구 확인**:

   - Network 탭에서 이미지 요청이 200 OK로 응답하는지 확인
   - Console 탭에서 Mixed Content 경고가 없는지 확인

2. **이미지 URL 확인**:

   - 에디터에서 이미지 업로드 후 이미지 URL이 `https://debate.me.kr/files/editor/images/...` 형식인지 확인
   - 토론 상세 페이지에서 이미지가 정상적으로 표시되는지 확인

3. **Nginx 로그 확인**:
   ```bash
   sudo tail -f /var/log/nginx/access.log
   sudo tail -f /var/log/nginx/error.log
   ```

## 추가 개선 사항

### 1. 백엔드에서 절대 URL 반환 (선택사항)

현재는 상대 경로(`/files/editor/images/...`)를 반환하고 프론트엔드에서 변환하는 방식입니다.
더 나은 방법은 백엔드에서 환경에 맞는 절대 URL을 반환하는 것입니다.

**FileUploadController.java 수정 예시**:

```java
@Value("${app.base-url:}")
private String baseUrl;

// 이미지 URL 생성 시
String imageUrl;
if (StringUtils.hasText(baseUrl)) {
    imageUrl = baseUrl + uploadUrlPrefix + "/" + filename;
} else {
    imageUrl = uploadUrlPrefix + "/" + filename;
}
```

**application-prod.yml에 추가**:

```yaml
app:
  base-url: https://debate.me.kr
```

### 2. 이미지 최적화 (선택사항)

- 이미지 리사이즈 및 압축
- WebP 형식 지원
- CDN 연동

## 문제 해결 체크리스트

- [ ] Nginx HTTPS 설정에 `/files` 경로 추가
- [ ] Nginx 설정 테스트 및 재시작
- [ ] 프론트엔드 코드 수정 및 재배포
- [ ] 브라우저에서 이미지 업로드 테스트
- [ ] 토론 상세 페이지에서 이미지 표시 확인
- [ ] 브라우저 개발자 도구에서 Mixed Content 경고 확인
- [ ] Nginx 로그에서 이미지 요청 확인

## 참고

- Nginx 설정 파일: `debate-https.nginx` (프로젝트 루트)
- 백엔드 파일 저장 경로: `/home/ubuntu/opt/debate/files/editor/images`
- 백엔드 파일 URL prefix: `/files/editor/images`




