/**
 * 웹 빌드를 GitHub Pages 로 올린다.
 *
 *   npm run deploy      # expo export 까지 한 번에
 *
 * dist 폴더를 그대로 gh-pages 가지에 밀어 넣는다. 소스 저장소(main)와 섞이지 않게
 * dist 안에 별도의 작은 저장소를 만들어 쓰고, 매번 통째로 덮어쓴다.
 *
 * .nojekyll 이 없으면 GitHub 이 밑줄로 시작하는 _expo 폴더를 통째로 무시해서
 * 화면이 하얗게 뜬다. 404.html 은 새로고침해도 앱이 살아 있게 하는 안전장치다.
 */
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.join(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const REPO = 'https://github.com/peoplewantshorts-dotcom/yeollim.git';
const URL = 'https://peoplewantshorts-dotcom.github.io/yeollim/';

if (!existsSync(path.join(dist, 'index.html'))) {
  console.error('dist/index.html 이 없습니다. 먼저 expo export --platform web 을 돌려주세요.');
  process.exit(1);
}

// 밑줄로 시작하는 폴더를 GitHub 이 건너뛰지 않게 한다
writeFileSync(path.join(dist, '.nojekyll'), '');
// 주소를 직접 치거나 새로고침해도 앱이 뜨게 한다
copyFileSync(path.join(dist, 'index.html'), path.join(dist, '404.html'));

const run = (cmd) => execSync(cmd, { cwd: dist, stdio: 'inherit' });

rmSync(path.join(dist, '.git'), { recursive: true, force: true });
run('git init -q');
run('git config user.name "이원형"');
run('git config user.email "peoplewantshorts@gmail.com"');
run('git add -A');
run('git commit -q -m "deploy: 열림 웹 미리보기"');
run('git branch -M gh-pages');
run(`git remote add origin ${REPO}`);
run('git push -f -q origin gh-pages');

console.log(`\n올렸습니다 → ${URL}`);
console.log('반영까지 1분쯤 걸립니다.');
