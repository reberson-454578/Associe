let hintCount = 0;
let maxHints = 2;
let currentGroup = null;
let groupWords = [];
let foundGroupContainer = null;
let availableColors = []; // Lista de cores disponíveis para garantir que não se repitam
let attempts = 0; // Contador de tentativas

document.addEventListener("DOMContentLoaded", () => {
  const currentTheme = localStorage.getItem("theme") || "dark";
  if (currentTheme === "light") {
    document.body.classList.add("light-theme");
    document.querySelector("#theme-toggle i").classList.remove("fa-moon");
    document.querySelector("#theme-toggle i").classList.add("fa-sun");
  }

  const gridContainer = document.getElementById("grid-container");
  let selectedWords = [];
  let foundGroups = [];
  let wordElements = [];

  // Referência ao elemento de exibição de tentativas no cabeçalho
  const attemptsDisplay = document.getElementById("attempts-display");

  // Lista de cores para grupos (inicialmente disponível)
  const colors = [
    "#6200ea",
    "#2e7d32",
    "#007aff",
    "#f44336",
    "#ff9800",
    "#9c27b0",
    "#03a9f4",
    "#4caf50",
    "#f9a825",
    "#795548",
  ];

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  availableColors = [...colors];

  function getRandomColor() {
    if (availableColors.length === 0) {
      availableColors = [...colors];
    }
    const randomIndex = Math.floor(Math.random() * availableColors.length);
    const selectedColor = availableColors[randomIndex];
    availableColors.splice(randomIndex, 1);
    return selectedColor;
  }

  foundGroupContainer = document.createElement("div");
  foundGroupContainer.id = "found-groups";
  document
    .getElementById("game-container")
    .insertBefore(foundGroupContainer, gridContainer);

  fetch("words.json")
    .then((response) => response.json())
    .then((data) => {
      const words = shuffle(data.words);
      words.forEach((word) => {
        const wordElement = document.createElement("div");
        wordElement.classList.add("word");
        wordElement.textContent = word;
        wordElement.addEventListener("click", () =>
          selectWord(wordElement, word)
        );
        gridContainer.appendChild(wordElement);
        wordElements.push(wordElement);
      });
      loadProgress(data.groups, data.groupTitles);
    });

  // Chame a função ao carregar o jogo ou após preencher o grid
  document.addEventListener("DOMContentLoaded", () => {
    adjustFontSizeForWords();
  });

  // Função para ajustar o tamanho da fonte
  function adjustFontSizeForWords() {
    const words = document.querySelectorAll(".word");

    words.forEach((word) => {
      const wordText = word.textContent.trim();
      const maxFontSize = 1.2; // Tamanho máximo da fonte
      const minFontSize = 0.5; // Tamanho mínimo da fonte
      const maxCharLength = 10; // Número máximo de caracteres antes de diminuir a fonte

      // Ajusta o tamanho da fonte de forma dinâmica baseado no número de caracteres
      if (wordText.length > maxCharLength) {
        const fontSize = Math.max(
          minFontSize,
          maxFontSize - (wordText.length - maxCharLength) * 0.05
        );
        word.style.fontSize = `${fontSize}rem`;
      } else {
        word.style.fontSize = `${maxFontSize}rem`; // Tamanho padrão se a palavra for curta
      }
    });
  }

  function selectWord(element, word) {
    if (selectedWords.includes(word)) {
      selectedWords = selectedWords.filter((w) => w !== word);
      element.classList.remove("selected");
    } else if (selectedWords.length < 4) {
      selectedWords.push(word);
      element.classList.add("selected");
    }

    if (selectedWords.length === 4) {
      checkGroup();
      incrementAttempts();
    }
  }

  function checkGroup() {
    fetch("words.json")
      .then((response) => response.json())
      .then((data) => {
        const groups = data.groups;
        const groupTitles = data.groupTitles;
        const isGroup = groups.some((group) =>
          selectedWords.every((word) => group.includes(word))
        );

        if (isGroup) {
          const foundGroup = selectedWords.slice();
          const groupIndex = groups.findIndex((group) =>
            foundGroup.every((word) => group.includes(word))
          );
          const groupColor = getRandomColor();
          foundGroups.push({ words: foundGroup, color: groupColor });
          renderFoundGroup(
            groupIndex,
            foundGroup,
            groupTitles[groupIndex],
            groupColor
          );
          hideWords(foundGroup);
          selectedWords = [];
          saveProgress();
        } else {
          selectedWords.forEach((word) => {
            const wordElement = wordElements.find(
              (el) => el.textContent === word
            );
            wordElement.classList.add("shake");
          });
          setTimeout(() => {
            selectedWords.forEach((word) => {
              const wordElement = wordElements.find(
                (el) => el.textContent === word
              );
              wordElement.classList.remove("shake");
            });
            resetSelectedWords();
          }, 100);
        }
      });
  }

  function renderFoundGroup(groupIndex, group, groupTitle, groupColor) {
    const groupBlock = document.createElement("div");
    groupBlock.classList.add("group-block");
    groupBlock.style.backgroundColor = groupColor;
    groupBlock.innerHTML = `<strong class="group-title">${groupTitle}</strong><br><span class="group-items">${group.join(
      ", "
    )}</span>`;
    foundGroupContainer.appendChild(groupBlock);
  }

  function hideWords(group) {
    group.forEach((word) => {
      const wordElement = wordElements.find((el) => el.textContent === word);
      wordElement.style.display = "none";
    });
  }

  function resetSelectedWords() {
    selectedWords = [];
    wordElements.forEach((element) => {
      element.classList.remove("selected");
    });
  }

  function incrementAttempts() {
    attempts++;
    attemptsDisplay.textContent = `Tentativas: ${attempts}`;
    localStorage.setItem("attempts", attempts);
  }

  function saveProgress() {
    const previousProgress = localStorage.getItem("gameProgress");
    let progress = { foundGroups: [], attempts, hintCount };

    if (previousProgress) {
      progress = JSON.parse(previousProgress);
      progress.attempts = attempts;
      progress.hintCount = hintCount;
    }

    foundGroups.forEach((group) => {
      if (
        !progress.foundGroups.some((g) => compareGroups(g.words, group.words))
      ) {
        progress.foundGroups.push(group);
      }
    });

    localStorage.setItem("gameProgress", JSON.stringify(progress));
  }

  function compareGroups(group1, group2) {
    if (group1.length !== group2.length) return false;
    return group1.every((word) => group2.includes(word));
  }

  function loadProgress(groups, groupTitles) {
    const savedProgress = localStorage.getItem("gameProgress");

    if (savedProgress) {
      const {
        foundGroups: savedGroups,
        attempts: savedAttempts,
        hintCount: savedHintCount,
      } = JSON.parse(savedProgress);

      savedGroups.forEach(({ words: group, color }, index) => {
        const groupIndex = groups.findIndex((g) =>
          group.every((word) => g.includes(word))
        );
        renderFoundGroup(groupIndex, group, groupTitles[groupIndex], color);
        hideWords(group);
      });

      attempts = savedAttempts;
      attemptsDisplay.textContent = `Tentativas: ${attempts}`;
      hintCount = savedHintCount;
    }
  }

  // Função para dar dicas
  window.giveHint = function giveHint() {
    if (hintCount >= maxHints) return;

    fetch("words.json")
      .then((response) => response.json())
      .then((data) => {
        const groups = data.groups;

        if (!currentGroup) {
          const availableGroups = groups.filter(
            (group) => !foundGroups.some((fg) => compareGroups(fg.words, group))
          );
          currentGroup =
            availableGroups[Math.floor(Math.random() * availableGroups.length)];
          groupWords = currentGroup.slice();
        }

        if (hintCount === 0) {
          const hintWords = groupWords.splice(0, 2);
          hintWords.forEach((word) => {
            const wordElement = wordElements.find(
              (el) => el.textContent === word
            );
            wordElement.classList.add("hint");
          });
        } else if (hintCount === 1) {
          const hintWords = groupWords.splice(0, 1);
          hintWords.forEach((word) => {
            const wordElement = wordElements.find(
              (el) => el.textContent === word
            );
            wordElement.classList.add("hint");
          });
        }

        hintCount++;
        saveProgress();

        if (groupWords.length === 0) currentGroup = null;
      });
  };
});

// Abre e fecha o modal do menu
function openMenuModal() {
  const modal = document.getElementById("menu-modal");
  modal.style.display = "block";
  modal.classList.add("active");
}

function closeMenuModal() {
  const modal = document.getElementById("menu-modal");
  modal.style.display = "none";
  modal.classList.remove("active");
}

window.onclick = function (event) {
  const modal = document.getElementById("menu-modal");
  if (event.target == modal) {
    closeMenuModal();
  }
};

// Função para alternar o tema
function toggleTheme() {
  const body = document.body;
  const themeToggle = document.querySelector("#theme-toggle i");

  body.classList.toggle("light-theme");

  if (body.classList.contains("light-theme")) {
    themeToggle.classList.remove("fa-moon");
    themeToggle.classList.add("fa-sun");
    themeToggle.classList.add("rotate");
    localStorage.setItem("theme", "light");
  } else {
    themeToggle.classList.remove("fa-sun");
    themeToggle.classList.add("fa-moon");
    themeToggle.classList.add("rotate");
    localStorage.setItem("theme", "dark");
  }

  setTimeout(() => {
    themeToggle.classList.remove("rotate");
  }, 500);
}

function checkNewDayAndResetProgress() {
  const today = new Date().toLocaleDateString(); // Pega a data atual
  const lastPlayedDate = localStorage.getItem("lastPlayedDate"); // Pega a data do último jogo

  // Se a data atual for diferente da última jogada, reseta o progresso
  if (lastPlayedDate !== today) {
    localStorage.removeItem("gameProgress"); // Remove o progresso salvo
    localStorage.removeItem("attempts"); // Reseta o contador de tentativas
    localStorage.setItem("lastPlayedDate", today); // Salva a nova data
    attempts = 0; // Reinicia o contador de tentativas
  }
}

// Chama a função ao carregar o jogo
checkNewDayAndResetProgress();
// Funções para abrir e fechar o modal "Como Jogar"
function openHowToPlay() {
  const howToPlayModal = document.getElementById("how-to-play-modal");
  howToPlayModal.style.display = "block";
  howToPlayModal.classList.add("active");
}

function closeHowToPlay() {
  const howToPlayModal = document.getElementById("how-to-play-modal");
  howToPlayModal.style.display = "none";
  howToPlayModal.classList.remove("active");
}

// Funções para abrir e fechar o modal "Sobre"
function openAbout() {
  const aboutModal = document.getElementById("about-modal");
  aboutModal.style.display = "block";
  aboutModal.classList.add("active");
}

function closeAbout() {
  const aboutModal = document.getElementById("about-modal");
  aboutModal.style.display = "none";
  aboutModal.classList.remove("active");
}
