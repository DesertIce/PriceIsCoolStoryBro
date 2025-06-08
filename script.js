const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

const sbServerAddress = urlParams.get("address") || "127.0.0.1";
const sbServerPort = urlParams.get("port") || "8080";

const client = new StreamerbotClient({
    host: sbServerAddress,
    port: sbServerPort,

    onConnect: (data) => {
        console.log(`Streamer.bot successfully connected to ${sbServerAddress}:${sbServerPort}`)
        console.debug(data);
        SetConnectionStatus(true);
    },

    onDisconnect: () => {
        console.error(`Streamer.bot disconnected from ${sbServerAddress}:${sbServerPort}`)
        SetConnectionStatus(false);
    }
});

const commands = Object.freeze(new Set([
    '!openprice',
    '!closeprice',
    '!clearprice',
    '!setprice'
]));


client.on('Twitch.ChatMessage', (response) => {
    console.debug(response.data);
    TwitchChatMessage(response.data);
})

let isAcceptingPrices = false;
updateStatusDisplay();
let playerPrices = new Map(); // Stores player names and their price guesses

function isValidDecimalInput(input) {
    const regex = /^\$?\d+(\.\d+)?$/;
    return regex.test(input);
}

function addPlayerPrice(playerName, price) {
    // Remove $ if present and convert to number
    const numericPrice = parseFloat(price.replace('$', ''));
    playerPrices.set(playerName, numericPrice);
    updatePriceDisplay();
}

function updatePriceDisplay() {
    const container = document.getElementById('price-container');
    if (!container) return;

    // Convert Map to array and sort by price
    const sortedPrices = Array.from(playerPrices.entries())
        .sort((a, b) => b[1] - a[1]);

    // Create HTML string
    const html = sortedPrices.map(([name, price]) => `
        <div class="price-entry hover-effect">
            <span class="player-name">${name}</span>
            <span class="price">$${price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</span>
        </div>
    `).join('');

    container.innerHTML = html;
}

function updateStatusDisplay() {
    const statusText = document.getElementById('status-text');
    if (statusText) {
        statusText.textContent = isAcceptingPrices ? 'Open' : 'Closed';
        statusText.className = isAcceptingPrices ? 'open' : '';
    }
}

async function TwitchChatMessage(data) {
    const message = data.message.message;
    const userName = data.message.username;
    const command = message.split(' ')[0].toLowerCase();

    if (commands.has(command) && data.message.role >= 3) {
        if (command === '!openprice') {
            isAcceptingPrices = true;
            updateStatusDisplay();
        }
        else if (command === '!closeprice') {
            isAcceptingPrices = false;
            updateStatusDisplay();
        }
        else if (command === '!clearprice') {
            playerPrices.clear();
            updatePriceDisplay();
        }
        else if (command === '!setprice') {
            const price = message.split(' ')[1];

            if (isValidDecimalInput(price)) {
                const numericPrice = parseFloat(price.replace('$', ''));
                let closestPlayer = null;
                let closestDiff = Infinity;

                for (const [player, p] of playerPrices) {
                    const diff = numericPrice - p;
                    if (diff >= 0 && diff < closestDiff) {
                        closestPlayer = player;
                        closestDiff = diff;
                    }
                }

                if (closestPlayer) {
                    const priceEntries = document.querySelectorAll('.price-entry');
                    for (const entry of priceEntries) {
                        const playerNameElement = entry.querySelector('.player-name');
                        if (playerNameElement && playerNameElement.textContent === closestPlayer) {
                            entry.classList.add('highlight-closest');
                            break;
                        }
                    }
                }
            }
        }
    } else if (isValidDecimalInput(message) && isAcceptingPrices) {
        addPlayerPrice(userName, message);
    }
}

function SetConnectionStatus(isConnected) {
    const connectionStatus = document.getElementById('connection-status');
    if (connectionStatus) {
        if (isConnected) {
            connectionStatus.textContent = 'Connected';
            connectionStatus.className = 'connection-status connected';
            // Show connected status for 5 seconds
            setTimeout(() => {
                connectionStatus.classList.add('hidden');
            }, 5000);
        } else {
            connectionStatus.textContent = 'Disconnected';
            connectionStatus.className = 'connection-status';
        }
    }
}