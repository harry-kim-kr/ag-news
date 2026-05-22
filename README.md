# Smart Farm Newsletter 자동화

한국 시간 매일 오전 7시에 스마트팜, 온실 자동화, 노지 자동화, 수직농장, 작물 재배 방식, 품종 및 농업 기술 이슈를 수집해 Blogger에 자동 업로드하는 프로젝트입니다.

## 준비물

1. Blogger API 권한 정보
2. GitHub 저장소
3. GitHub Actions Secrets

GitHub 저장소의 `Settings > Secrets and variables > Actions`에 아래 값을 등록하세요.

| Secret | 설명 |
| --- | --- |
| `BLOGGER_BLOG_ID` | Blogger 블로그 ID |
| `GOOGLE_CLIENT_ID` | OAuth 클라이언트 ID |
| `GOOGLE_CLIENT_SECRET` | OAuth 클라이언트 보안 비밀 |
| `GOOGLE_REFRESH_TOKEN` | Blogger 권한이 포함된 refresh token |
| `OPENAI_API_KEY` | 선택. 더 자연스러운 한국어 편집본 생성용 |

## 로컬 미리보기

```bash
npm install
cp .env.example .env
npm run newsletter:preview
```

## Blogger 업로드

```bash
npm run newsletter:publish
```

## 자동 실행 시간

`.github/workflows/newsletter.yml`은 UTC 22:00에 실행됩니다. 한국 시간으로는 매일 오전 7시입니다.

## Blogger 테마 적용

`blogger-theme.xml` 파일 내용을 Blogger 관리자 화면의 `테마 > HTML 편집`에 붙여 넣으면 뉴스레터형 레이아웃이 적용됩니다.
