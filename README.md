# 요거트 아이스크림 만들기

쉘 붓고, 토핑 올리고, 시럽 뿌려서 나만의 아이스크림 레시피를 만드는 모바일 웹 체험입니다. 빌드 없이 `index.html`만 열면 돌아가는 정적 사이트입니다.

- 배포: Vercel (Framework Preset: Other, 빌드 명령 없음, 출력 폴더는 저장소 루트)
- 원본 디자인과 생성 스크립트는 프로젝트 폴더의 캔버스 보드에서 내보냅니다. 이 저장소의 파일은 직접 고치지 말고 다시 내보내 덮어씁니다.

## 서버 함수와 환경변수

- `api/feedback.js` 피드백 메일: `SMTP_USER`, `SMTP_PASS`, `FEEDBACK_TO`
- `api/recipe.js`, `api/r.js` 레시피 썸네일(공유 링크 미리보기), `api/order.js` 주문 번호: Vercel Blob 스토어를 프로젝트에 연결해야 생기는 `BLOB_READ_WRITE_TOKEN`
  - 없으면 주문 번호 없이 나오고, 레시피 링크 미리보기는 기본 og.png로 나옵니다.
