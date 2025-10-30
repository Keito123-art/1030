// 核心測驗變數
let questionsTable; // 儲存 CSV 題庫的 p5.Table 物件
let currentQuestionIndex = 0; // 當前題目的索引
let score = 0; // 學生分數
let quizState = 'START'; // 測驗狀態: 'START', 'QUESTION', 'FEEDBACK', 'RESULT'
let selectedOption = -1; // 使用者選擇的選項 (A=0, B=1, ...)
let feedbackMessage = ''; // 儲存回饋訊息

// 游標特效相關
let customCursorX, customCursorY;
let cursorTrail = []; // 游標尾跡陣列
const TRAIL_LENGTH = 15; // 尾跡長度
let starParticles = []; // 用於稱讚動畫的粒子陣列

// 在 setup() 之前載入 CSV 檔案
function preload() {
  // 'header' 表示 CSV 包含標題行
  questionsTable = loadTable('questions.csv', 'csv', 'header');
}

function setup() {
  // 建立能動態調整的畫布
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 1); // 使用 HSB 色彩模式
  
  // 隱藏系統游標，改用自繪游標
  noCursor();
  
  // 初始游標位置
  customCursorX = mouseX;
  customCursorY = mouseY;
  
  // 初始化響應式版面參數
  computeLayout();
}

// 當視窗大小變更時重新調整畫布與版面
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  computeLayout();
}

// layout 變數：儲存會隨視窗改變的尺寸與按鈕矩形
let layout = {};
let optionRects = []; // 目前題目的按鈕矩形，用於點擊偵測

function computeLayout() {
  // 以設計稿 800x600 為基準，計算縮放比例
  let baseW = 800;
  let baseH = 600;
  let sx = windowWidth / baseW;
  let sy = windowHeight / baseH;
  // 使用 min 保持比例一致
  let s = min(sx, sy);
  layout.scale = s;

  // 邊距與排版
  layout.margin = max(16, 50 * s);
  layout.gap = max(8, 24 * s);

  // 文字大小（可根據需要調整）
  layout.titleSize = max(18, 40 * s);
  layout.subtitleSize = max(12, 24 * s);
  layout.questionSize = max(14, 24 * s);
  layout.optionTextSize = max(12, 20 * s);

  // 選項按鈕尺寸（會在 drawQuestion 中依據寬度與版面計算實際位置）
  layout.buttonHeight = max(36, 50 * s);
  layout.buttonCorner = max(4, 8 * s);
}

function draw() {
  background(20);
  
  // 1. 繪製自定義游標特效
  drawCustomCursor();
  
  // 2. 根據測驗狀態繪製畫面
  switch (quizState) {
    case 'START':
      drawStartScreen();
      break;
    case 'QUESTION':
      drawQuestion();
      break;
    case 'FEEDBACK':
      drawFeedback();
      break;
    case 'RESULT':
      drawResultScreen();
      // 在此繪製基於分數的稱讚/鼓勵動畫
      drawResultAnimation(); 
      break;
  }
}

// --- 主要畫面繪製函式 ---

function drawStartScreen() {
  fill(0, 0, 100); // 白色文字
  textAlign(CENTER);
  textSize(layout.titleSize);
  text("p5.js 互動測驗系統", width / 2, height / 3);
  
  textSize(layout.subtitleSize);
  fill(120, 80, 100); // 綠色
  text("點擊畫布任何地方開始測驗", width / 2, height / 2);
}

function drawQuestion() {
  if (currentQuestionIndex >= questionsTable.getRowCount()) {
    quizState = 'RESULT';
    return;
  }
  
  let questionRow = questionsTable.getRow(currentQuestionIndex);
  let questionText = questionRow.getString('Question');
  let options = [
    questionRow.getString('OptionA'),
    questionRow.getString('OptionB'),
    questionRow.getString('OptionC'),
    questionRow.getString('OptionD')
  ];
  
  // 問題文字
  textAlign(LEFT);
  textSize(layout.questionSize);
  fill(0, 0, 100); 
  let qx = layout.margin;
  let qy = layout.margin * 1.2;
  // 限制問題文字寬度，超出自動換行（簡單實作：使用 text() 的 maxWidth 參數）
  text(questionText, qx, qy, width - layout.margin * 2);

  // 根據視窗寬度決定按鈕排列：窄版 (單欄)、中寬(單欄)、寬版(二欄)
  let isNarrow = width < 600;
  let isWide = width > 1000;

  // 計算按鈕寬度與間距
  let btnW;
  let btnH = layout.buttonHeight;
  let startY = qy + layout.questionSize * 3;
  optionRects = [];

  if (isWide) {
    // 兩欄排列
    let colW = (width - layout.margin * 2 - layout.gap) / 2;
    btnW = colW;
    for (let i = 0; i < options.length; i++) {
      let col = i % 2;
      let row = floor(i / 2);
      let btnX = layout.margin + col * (colW + layout.gap);
      let btnY = startY + row * (btnH + layout.gap);
      optionRects.push({x: btnX, y: btnY, w: btnW, h: btnH});
    }
  } else {
    // 單欄排列 (包含窄版和中等寬度)
    btnW = width - layout.margin * 2;
    for (let i = 0; i < options.length; i++) {
      let btnX = layout.margin;
      let btnY = startY + i * (btnH + layout.gap);
      optionRects.push({x: btnX, y: btnY, w: btnW, h: btnH});
    }
  }

  // 繪製按鈕
    
  for (let i = 0; i < options.length; i++) {
    let r = optionRects[i];
    let isHovering = mouseX > r.x && mouseX < r.x + r.w && mouseY > r.y && mouseY < r.y + r.h;
    noStroke();
    if (selectedOption === i) {
      let pulse = map(sin(frameCount * 0.2), -1, 1, 0, 100);
      stroke(50, 100, 100, 1);
      strokeWeight(3 * layout.scale);
      fill(200, 50, 50, 0.85 + pulse * 0.002);
    } else if (isHovering) {
      fill(200, 50, 30, 0.6);
    } else {
      fill(0, 0, 10, 1);
    }
    rect(r.x, r.y, r.w, r.h, layout.buttonCorner);

    // 選項文字
    noStroke();
    fill(0, 0, 100);
    textSize(layout.optionTextSize);
    textAlign(LEFT, CENTER);
    let label = String.fromCharCode(65 + i) + ". " + options[i];
    text(label, r.x + 15 * layout.scale, r.y + r.h / 2, r.w - 30 * layout.scale);
  }
}

function drawFeedback() {
  textAlign(CENTER);
  
  if (feedbackMessage.includes('正確')) {
    fill(120, 100, 90); // 綠色系
    textSize(layout.titleSize);
    text("⭐ 正確! 稱讚您! ⭐", width / 2, height / 2 - layout.margin);
    // 稱讚動畫
    animatePraise(); 
  } else {
    fill(0, 100, 90); // 紅色系
    textSize(layout.titleSize);
    text("😅 錯誤... 別氣餒! 😅", width / 2, height / 2 - layout.margin);
    // 鼓勵動畫
    animateEncouragement(); 
    textSize(layout.optionTextSize);
    fill(0, 0, 100);
    text(feedbackMessage, width / 2, height / 2 + layout.margin / 2);
  }
  
  textSize(layout.subtitleSize);
  fill(200, 50, 100); // 藍色
  text("點擊繼續下一題...", width / 2, height - layout.margin);
}

function drawResultScreen() {
  fill(0, 0, 100);
  textAlign(CENTER);
  textSize(layout.titleSize);
  text("測驗圓滿結束！", width / 2, height / 4);
  
  textSize(layout.questionSize);
  text(`您的最終得分是: ${score} / ${questionsTable.getRowCount()}`, width / 2, height / 2 - layout.margin);
}

// --- 特效/動畫函式 ---

function drawCustomCursor() {
  // 游標位置平滑移動 (拖曳感/遲滯感)
  customCursorX = lerp(customCursorX, mouseX, 0.3); // 0.3 的移動速度
  customCursorY = lerp(customCursorY, mouseY, 0.3);
  
  // 游標尾跡 (Trail) - 使用顏色漸變和透明度變化
  let newPoint = createVector(customCursorX, customCursorY);
  cursorTrail.push(newPoint);
  if (cursorTrail.length > TRAIL_LENGTH) {
    cursorTrail.shift(); // 移除最舊的點
  }
  
  // 繪製尾跡
  for (let i = 0; i < cursorTrail.length; i++) {
    let p = cursorTrail[i];
    let diameter = map(i, 0, TRAIL_LENGTH - 1, 5, 12); // 讓點越接近游標越大
    let alpha = map(i, 0, TRAIL_LENGTH - 1, 0.2, 0.8); // 讓點越接近游標越不透明
    let hue = map(i, 0, TRAIL_LENGTH - 1, 40, 60); // 黃綠色系
    
    fill(hue, 80, 100, alpha); 
    noStroke();
    ellipse(p.x, p.y, diameter, diameter);
  }
  
  // 繪製游標本體 (最亮的部分)
  fill(60, 100, 100); // 亮黃色
  noStroke();
  ellipse(customCursorX, customCursorY, 8, 8);
}

function animatePraise() {
  // 稱讚動畫：滿屏的彩色星星粒子爆發
  if (frameCount % 5 === 0) { // 每隔幾幀產生粒子
    for (let i = 0; i < 5; i++) {
      let hue = random(360);
      starParticles.push(new StarParticle(width / 2, height / 2, hue));
    }
  }
  
  // 更新並繪製粒子
  for (let i = starParticles.length - 1; i >= 0; i--) {
    starParticles[i].update();
    starParticles[i].display();
    if (starParticles[i].isFinished()) {
      starParticles.splice(i, 1); // 移除結束生命週期的粒子
    }
  }
}

// 粒子物件 (用於稱讚動畫)
class StarParticle {
  constructor(x, y, hue) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D();
    this.vel.mult(random(2, 6)); // 初速度
    this.lifespan = 255;
    this.r = 8; // 粒子大小
    this.hue = hue;
  }
  
  update() {
    this.pos.add(this.vel);
    this.vel.mult(0.95); // 摩擦力減速
    this.lifespan -= 5;
  }
  
  display() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(frameCount * 0.1); // 讓星星旋轉
    noStroke();
    fill(this.hue, 100, 100, this.lifespan / 255);
    
    // 繪製五角星形
    star(0, 0, this.r * 0.4, this.r, 5); 
    pop();
  }
  
  isFinished() {
    return this.lifespan < 0;
  }
}

// 繪製星星的輔助函式
function star(x, y, radius1, radius2, npoints) {
  let angle = TWO_PI / npoints;
  let halfAngle = angle / 2.0;
  beginShape();
  for (let a = 0; a < TWO_PI; a += angle) {
    let sx = x + cos(a) * radius2;
    let sy = y + sin(a) * radius2;
    vertex(sx, sy);
    sx = x + cos(a + halfAngle) * radius1;
    sy = y + sin(a + halfAngle) * radius1;
    vertex(sx, sy);
  }
  endShape(CLOSE);
}

function animateEncouragement() {
  // 鼓勵動畫：背景柔和跳動的心形
  let heartSize = map(sin(frameCount * 0.1), -1, 1, 150, 180); // 隨時間跳動大小
  fill(340, 80, 80, 0.7); // 柔和的粉紅色/紅色，半透明
  noStroke();
  
  push();
  translate(width / 2, height / 2);
  
  // 繪製心形 (標準心形數學公式)
  beginShape();
  for (let t = 0; t < TWO_PI; t += 0.1) {
    let x = heartSize * 16 * pow(sin(t), 3);
    let y = -heartSize * (13 * cos(t) - 5 * cos(2 * t) - 2 * cos(3 * t) - cos(4 * t));
    vertex(x / 40, y / 40); // 縮小到適當大小
  }
  endShape(CLOSE);
  pop();
}

function drawResultAnimation() {
    // 根據分數比例決定最終動畫畫面
    let totalQuestions = questionsTable.getRowCount();
    let percent = score / totalQuestions;

    textAlign(CENTER);
    textSize(50);
    noStroke();
    
    if (percent >= 0.8) {
        // 高分：滿分煙火特效
        fill(60, 100, 100); // 金色文字
        text("🔥 恭喜！頂尖表現！ 🔥", width / 2, height / 2 + 50);
        animatePraise(); // 沿用星星粒子，讓其更密集
    } else if (percent >= 0.5) {
        // 中等分數：氣泡上升/緩慢光芒
        fill(200, 80, 100); // 藍色文字
        text("👍 表現不錯！繼續加油！ 👍", width / 2, height / 2 + 50);
        
        // 氣泡上升動畫
        for (let i = 0; i < 10; i++) {
          let x = noise(i * 0.1, frameCount * 0.01) * width;
          let y = (frameCount * 1.5 + i * 50) % (height + 200) - 100;
          let r = map(sin(frameCount * 0.05 + i), -1, 1, 10, 25);
          fill(200, 50, 100, 0.5 - y / height * 0.5); // 越往上越透明
          ellipse(x, y, r, r);
        }
    } else {
        // 低分：柔和鼓勵畫面
        fill(30, 80, 100); // 橙色文字
        text("💪 這次沒關係，下次會更好！ 💪", width / 2, height / 2 + 50);
        
        // 柔和波紋背景
        for (let i = 0; i < 5; i++) {
          let radius = map(sin(frameCount * 0.02 + i), -1, 1, 50, width);
          stroke(30, 80, 100, 0.3);
          strokeWeight(5);
          noFill();
          ellipse(width / 2, height / 2, radius, radius);
        }
    }
}


// --- 互動函式 ---

function mouseClicked() {
  if (quizState === 'START') {
    quizState = 'QUESTION';
    return;
  }
  
  if (quizState === 'FEEDBACK') {
    // 清空粒子
    starParticles = []; 
    
    // 進入下一題
    currentQuestionIndex++;
    selectedOption = -1;
    if (currentQuestionIndex < questionsTable.getRowCount()) {
      quizState = 'QUESTION';
    } else {
      quizState = 'RESULT';
    }
    return;
  }
  
  if (quizState === 'QUESTION') {
    let questionRow = questionsTable.getRow(currentQuestionIndex);
    let optionsLength = 4;
    // 使用 drawQuestion 中建立的 optionRects 來檢查點擊
    for (let i = 0; i < optionsLength; i++) {
      if (i >= optionRects.length) continue; // 安全檢查
      let r = optionRects[i];
      if (mouseX > r.x && mouseX < r.x + r.w && mouseY > r.y && mouseY < r.y + r.h) {
        selectedOption = i;
        let correctOptionIndex = questionRow.getNum('CorrectOption'); 
        if (selectedOption === correctOptionIndex) {
          score++;
          feedbackMessage = '正確!';
        } else {
          feedbackMessage = '錯誤... 正確答案是 ' + questionRow.getString(String.fromCharCode(65 + correctOptionIndex));
        }
        quizState = 'FEEDBACK';
        break;
      }
    }
  }
}