// JS Game Logic

let playerHand = [];
let aiHand = [];
let deck = [];
let topCard;
let playerTurn = true;

const values = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "Skip", "Reverse", "+2"];
const colors = ["red", "green", "blue", "yellow"];
const specialCards = ["Wild", "+4"];

// --- Sound Effects ---
const drawSound = new Audio('draw.mp3');
const winSound = new Audio('win.wav');
const lossSound = new Audio('loss.wav');
const playCardSound = new Audio('play.wav');

// --- Background Music ---
// FIX: Get the audio element from the HTML document
const backgroundMusic = document.getElementById('bg');
backgroundMusic.loop = true;

// Get reference to the music toggle button
let musicToggleButton; // Will be initialized in window.onload

function updateMusicButtonImage() {
    if (musicToggleButton) {
        if (backgroundMusic.paused) {
            musicToggleButton.style.backgroundImage = 'url("off.png")';
            musicToggleButton.title = 'Music Off';
        } else {
            musicToggleButton.style.backgroundImage = 'url("on.webp")';
            musicToggleButton.title = 'Music On';
        }
    }
}

function createDeck() {
    let d = [];
    colors.forEach(color => {
        values.forEach(value => {
            d.push({ color, value });
            if (value !== "0") d.push({ color, value });
        });
    });
    specialCards.forEach(value => {
        for (let i = 0; i < 4; i++) d.push({ color: "black", value });
    });
    return shuffle(d);
}

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function drawCard(n, hand) {
    for (let i = 0; i < n; i++) {
        if (deck.length === 0) deck = createDeck();
        hand.push(deck.pop());
    }
    drawSound.play(); // Play draw sound when a card is drawn
}

function onDrawCard() {
    if (!playerTurn) return;
    drawCard(1, playerHand);
    playerTurn = false;
    updateUI();
    setTimeout(aiMove, 1000);
}

function isPlayable(card) {
    return card.color === topCard.color || card.value === topCard.value || card.color === "black";
}

function playCard(card) {
    // Check if it's the player's turn and the card is playable
    if (!playerTurn || !isPlayable(card)) {
        showMessage("Cannot play this card!");
        return;
    }

    // Remove the card from the player's hand
    const cardIndex = playerHand.indexOf(card);
    if (cardIndex > -1) {
        playerHand.splice(cardIndex, 1);
    } else {
        console.error("Attempted to play a card not in hand:", card);
        return;
    }

    topCard = card; // Set the played card as the new top card
    playCardSound.play(); // Play sound when a card is played

    const result = handleSpecial(card, playerHand, aiHand, true);

    if (result === "color-pick") {
        updateUI();
        return; // Wait for color selection from the player
    }

    updateUI(); // Update UI immediately after playing the card

    // Game end check
    if (playerHand.length === 0) {
        showMessage("🎉 You win!");
        winSound.play(); // Play win sound
        document.getElementById("draw-pile-button").disabled = true;
        return;
    }

    // Transition to AI turn
    setTimeout(() => {
        if (result === "skip" || result === "reverse") {
            playerTurn = false;
            aiMove();
        } else {
            playerTurn = false;
            aiMove();
        }
    }, 1000);
}


function handleSpecial(card, currentHand, otherHand, isPlayer) {
    if (card.value === "+2") {
        drawCard(2, otherHand);
        showMessage(`${isPlayer ? "AI" : "You"} drew 2 cards!`);
    } else if (card.value === "+4") {
        drawCard(4, otherHand);
        if (isPlayer) {
            showColorPicker();
            return "color-pick";
        } else {
            const aiColor = pickColor(); // AI picks a color
            topCard.color = aiColor; // Update the color of the top card
            updateUI();
            showMessage(`💡 AI chose ${aiColor.toUpperCase()} after +4`);
        }
    } else if (card.value === "Wild") {
        if (isPlayer) {
            showColorPicker();
            return "color-pick";
        } else {
            const aiColor = pickColor(); // AI picks a color
            topCard.color = aiColor; // Update the color of the top card
            updateUI();
            showMessage(`💡 AI chose ${aiColor.toUpperCase()} after Wild`);
        }
    } else if (card.value === "Skip") {
        showMessage(`${isPlayer ? "You" : "AI"} played Skip!`);
        return "skip";
    } else if (card.value === "Reverse") {
        showMessage(`${isPlayer ? "You" : "AI"} played Reverse!`);
        return "reverse"; // In a 2-player game, reverse acts like a skip.
    }

    return null; // No special action or action handled immediately
}

function pickColor() {
    // Simple AI color choice: pick the color it has the most of
    const colorsInHand = aiHand.map(card => card.color).filter(color => color !== "black");
    if (colorsInHand.length > 0) {
        const colorCounts = {};
        colorsInHand.forEach(color => {
            colorCounts[color] = (colorCounts[color] || 0) + 1;
        });
        let bestColor = "";
        let maxCount = 0;
        for (const color in colorCounts) {
            if (colorCounts[color] > maxCount) {
                bestColor = color;
                maxCount = colorCounts[color];
            }
        }
        return bestColor;
    }
    // If AI has no colored cards, pick a random color
    return colors[Math.floor(Math.random() * colors.length)];
}


function aiMove() {
    updateUI(); // Update UI at the start of AI's turn
    showMessage("AI's Turn...");

    setTimeout(() => {
        const playable = aiHand.filter(isPlayable);
        if (playable.length > 0) {
            // AI plays a random playable card
            const card = playable[Math.floor(Math.random() * playable.length)];
            topCard = card;
            aiHand.splice(aiHand.indexOf(card), 1);
            playCardSound.play(); // Play sound when AI plays a card
            showMessage(`AI played a ${card.color === 'black' ? '' : card.color} ${card.value} card.`);

            const result = handleSpecial(card, aiHand, playerHand, false); // AI is not player

            updateUI(); // Update UI after AI plays

            if (aiHand.length === 0) {
                showMessage("🤖 AI wins!");
                lossSound.play(); // Play loss sound
                document.getElementById("draw-pile-button").disabled = true; // Disable further moves
                return;
            }

            // If AI played a skip, reverse, or +4/Wild requiring color pick, AI gets another turn
            if (result === "skip" || result === "reverse" || result === "color-pick") {
                setTimeout(aiMove, 1000); // AI plays again
                return;
            }

        } else {
            // AI has no playable cards, draws one
            drawCard(1, aiHand); // drawCard function already plays the sound
            showMessage("AI drew a card.");
            updateUI(); // Update UI after AI draws
        }

        playerTurn = true; // It's now player's turn
        showMessage("Your Turn!");
        updateUI(); // Final UI update for player's turn
    }, 1500); // Increased delay for AI's turn to be more noticeable
}


function chooseColor(color) {
    topCard.color = color; // This is the crucial line that changes the topCard's color
    document.getElementById("color-picker").classList.add("hidden");
    updateUI(); // Redraws the UI, calling createCard with the updated topCard color
    showMessage(`You chose ${color.toUpperCase()}`);
    setTimeout(() => {
        playerTurn = false; // End player's turn after color choice
        aiMove();
    }, 1000);
}

function showColorPicker() {
    document.getElementById("color-picker").classList.remove("hidden");
}

function showMessage(msg) {
    const messageBox = document.getElementById("message");
    messageBox.textContent = msg;
    messageBox.classList.remove("hidden");
    // Clear previous timeout to ensure message is shown for its full duration
    if (messageBox.timeoutId) {
        clearTimeout(messageBox.timeoutId);
    }
    messageBox.timeoutId = setTimeout(() => messageBox.classList.add("hidden"), 2000);
}

function createCard(card) {
    const div = document.createElement("div");
    div.classList.add("card");

    const img = document.createElement("img");
    img.classList.add("custom-card-img");

    // Determine the image source based on card properties
    if (card.color === "blue") {
        if (card.value === "Reverse") {
            img.src = "rb.jpg";
        } else if (card.value === "Skip") {
            img.src = "skipb.jpg";
        } else if (card.value === "+2") {
            img.src = "+2b.jpg";
        } else if (card.value === "Wild") { // Specific image for Wild card chosen blue
            img.src = "wb.jpg";
            img.alt = "Blue Wild Card";
        } else if (card.value === "0") {
            img.src = "0b.jpg";
        } else if (card.value === "1") {
            img.src = "1b.jpg";
        } else if (card.value === "2") {
            img.src = "2b.jpg";
        } else if (card.value === "3") {
            img.src = "3b.jpg";
        } else if (card.value === "4") {
            img.src = "4b.jpg"; // Assuming you have 4b.jpg
        } else if (card.value === "5") {
            img.src = "5b.jpg";
        } else if (card.value === "6") {
            img.src = "6b.jpg";
        } else if (card.value === "7") {
            img.src = "7b.jpg";
        } else if (card.value === "8") {
            img.src = "8b.jpg"; // Assuming you have 8b.jpg
        } else if (card.value === "9") {
            img.src = "9b.jpg"; // Assuming you have 9b.jpg
        }
        else {
            // Fallback for any blue card not explicitly listed above, if you have a naming convention
            img.src = `${card.value}b.jpg`;
        }
        img.alt = `Blue ${card.value}`;
    } else if (card.color === "red") {
        if (card.value === "Reverse") {
            img.src = "rr.jpg";
        } else if (card.value === "Skip") {
            img.src = "sr.jpg";
        } else if (card.value === "+2") {
            img.src = "+2r.jpg";
        } else if (card.value === "Wild") { // Specific image for Wild card chosen red
            img.src = "wr.jpg";
            img.alt = "Red Wild Card";
        } else if (card.value === "0") {
            img.src = "0r.jpg";
        } else if (card.value === "1") {
            img.src = "1r.jpg";
        } else if (card.value === "2") {
            img.src = "2r.jpg";
        } else if (card.value === "3") {
            img.src = "3r.jpg";
        } else if (card.value === "4") {
            img.src = "4r.jpg";
        } else if (card.value === "5") {
            img.src = "5r.jpg";
        } else if (card.value === "6") {
            img.src = "6r.jpg";
        } else if (card.value === "7") {
            img.src = "7r.jpg";
        } else if (card.value === "8") {
            img.src = "8r.jpg"; // Assuming you have 8r.jpg
        } else if (card.value === "9") {
            img.src = "9r.jpg"; // Assuming you have 9r.jpg
        }
        else {
            img.src = `${card.value}r.jpg`;
        }
        img.alt = `Red ${card.value}`;
    } else if (card.color === "green") {
        if (card.value === "Reverse") {
            img.src = "rg.jpg";
        } else if (card.value === "Skip") {
            img.src = "sg.jpg";
        } else if (card.value === "+2") {
            img.src = "+2g.jpg"; // Assuming you have a +2g.jpg
        } else if (card.value === "Wild") { // Specific image for Wild card chosen green
            img.src = "wg.jpg";
            img.alt = "Green Wild Card";
        } else if (card.value === "0") {
            img.src = "0g.jpg";
        } else if (card.value === "1") {
            img.src = "1g.jpg";
        } else if (card.value === "2") {
            img.src = "2g.jpg";
        } else if (card.value === "3") {
            img.src = "3g.jpg";
        } else if (card.value === "4") {
            img.src = "4g.jpg";
        } else if (card.value === "5") {
            img.src = "5g.jpg";
        } else if (card.value === "6") {
            img.src = "6g.jpg";
        } else if (card.value === "7") {
            img.src = "7g.jpg";
        } else if (card.value === "8") {
            img.src = "8g.jpg"; // Assuming you have 8g.jpg
        } else if (card.value === "9") {
            img.src = "9g.jpg"; // Assuming you have 9g.jpg
        }
        else {
            img.src = `${card.value}g.jpg`;
        }
        img.alt = `Green ${card.value}`;
    } else if (card.color === "yellow") {
        if (card.value === "Reverse") {
            img.src = "ry.jpg"; // Assuming you have a ry.jpg
        } else if (card.value === "Skip") {
            img.src = "sy.jpg"; // Assuming you have a sy.jpg
        } else if (card.value === "+2") {
            img.src = "+2y.jpg"; // Assuming you have a +2y.jpg
        } else if (card.value === "Wild") { // Specific image for Wild card chosen yellow
            img.src = "wy.jpg";
            img.alt = "Yellow Wild Card";
        } else if (card.value === "0") {
            img.src = "oy.jpg";
        } else if (card.value === "1") {
            img.src = "1y.jpg";
        } else if (card.value === "2") {
            img.src = "2y.jpg";
        } else if (card.value === "3") {
            img.src = "3y.jpg";
        } else if (card.value === "4") {
            img.src = "4y.jpg";
        } else if (card.value === "5") {
            img.src = "5y.jpg";
        } else if (card.value === "6") {
            img.src = "6y.jpg";
        } else if (card.value === "7") {
            img.src = "7y.jpg";
        } else if (card.value === "8") {
            img.src = "8y.jpg"; // Assuming you have 8y.jpg
        } else if (card.value === "9") {
            img.src = "9y.jpg"; // Assuming you have 9y.jpg
        }
        else {
            img.src = `${card.value}y.jpg`;
        }
        img.alt = `Yellow ${card.value}`;
    } else if (card.color === "black") {
        // Handle Wild and +4 cards when their initial color is black (i.e., before color choice)
        if (card.value === "+4") {
            // This is the specific image for the +4 card (the one you provided earlier)
            img.src = "+4.jpg"; // Corrected this to use the actual filename provided
            img.alt = "Wild +4 Card";
        } else if (card.value === "Wild") {
            // This is the generic rainbow wild card for unplayed wild cards
            img.src = "wild.jpg";
            img.alt = "Wild Card";
        }
    }

    div.appendChild(img);
    return div;
}


function updateUI() {
    const playerDiv = document.getElementById("player-hand");
    const aiDiv = document.getElementById("ai-hand");
    const topDiv = document.getElementById("top-card");

    playerDiv.innerHTML = "";
    aiDiv.innerHTML = "";
    topDiv.innerHTML = "";

    // Render player's hand
    playerHand.forEach(card => {
        const cardElement = createCard(card);
        // Attach click listener only for playable cards
        if (playerTurn && isPlayable(card)) {
            cardElement.onclick = () => playCard(card);
            cardElement.style.cursor = "pointer"; // Indicate it's clickable
        } else {
            cardElement.style.cursor = "default"; // Not clickable
        }
        playerDiv.appendChild(cardElement);
    });

    // Render AI's hand (face down)
    aiHand.forEach(() => {
        const back = document.createElement("div");
        back.classList.add("card", "back");
        aiDiv.appendChild(back);
    });

    // Render the top card
    if (topCard) {
        const topCardElement = createCard(topCard);
        topDiv.innerHTML = ''; // Clear previous content
        topDiv.appendChild(topCardElement);

        // This section handles the background color/gradient of the TOP CARD SLOT
        // It helps visually indicate the current active color, especially for wild cards
        if (topCard.color && topCard.color !== "black") {
            topDiv.className = 'card-slot'; // Reset classes
            topDiv.classList.add(topCard.color); // Add the specific color class
            topDiv.style.background = ''; // Clear any inline background if a class defines it
        } else if (topCard.color === "black" && topCard.value === "+4") {
            // For the +4 card, which is black but often has a rainbow effect
            topDiv.className = 'card-slot'; // Reset classes
            topDiv.style.background = "linear-gradient(45deg, red, yellow, green, blue)";
        } else {
            // For other black cards (like unplayed Wild) or if no specific color is set
            topDiv.className = 'card-slot'; // Reset classes
            topDiv.style.background = ''; // Clear any inline background, rely on image/default
        }
        topDiv.style.border = "3px solid white"; // Keep border
    }
}

function startGame() {
    deck = createDeck();
    playerHand = [];
    aiHand = [];
    drawCard(7, playerHand);
    drawCard(7, aiHand);
    topCard = deck.pop();
    // Ensure the initial top card is not a special action card that requires immediate player choice
    while (topCard.value === "Wild" || topCard.value === "+4" || topCard.value === "+2" || topCard.value === "Skip" || topCard.value === "Reverse") {
        deck.unshift(topCard); // Put it back
        topCard = deck.pop();  // Draw a new one
    }
    playerTurn = true; // Player starts
    updateUI();
    showMessage("Game Started! Your Turn!");
    // document.getElementById("draw-pile-button").disabled = false; // This ID doesn't exist for the draw button in your HTML
    document.getElementById("draw-pile").disabled = false; // Correct ID for draw button

    // Attempt to play background music on game start
    backgroundMusic.play().catch(e => console.log("Background music autoplay blocked:", e));
    updateMusicButtonImage(); // Set the initial button image state
}

function onRestart() {
    startGame(); // Simply call startGame to reset everything
    showMessage("🔄 Game Restarted!");
}

window.onload = () => {
    musicToggleButton = document.getElementById("toggle-music-button"); // Get the music toggle button element

    // IMPORTANT: If musicToggleButton is not present in your HTML, this will be null.
    // Ensure you have a button in your HTML with id="toggle-music-button"
    // If you don't have it, the music control won't work, and music will rely on autoplay or a user click.

    startGame();

    // Attach the event listener to the draw pile button
    document.getElementById("draw-pile").onclick = onDrawCard; // Correct ID for draw button

    // Make sure the restart button also works as intended
    document.getElementById("Restart").onclick = onRestart;

    // Only attach music toggle listener if the button exists
    if (musicToggleButton) {
        musicToggleButton.onclick = () => {
            if (backgroundMusic.paused) {
                backgroundMusic.play().catch(e => console.log("Error playing music:", e));
            } else {
                backgroundMusic.pause();
            }
            updateMusicButtonImage(); // Update the button image after toggling music
        };

        // Corrected typo here: from ononpause to onpause
        backgroundMusic.onplay = updateMusicButtonImage;
        backgroundMusic.onpause = updateMusicButtonImage;
    } else {
        console.warn("Music toggle button with ID 'toggle-music-button' not found in HTML.");
    }
};