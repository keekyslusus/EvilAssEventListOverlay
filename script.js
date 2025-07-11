const eventList = document.getElementById('event-list');
const processedDonationIds = new Set();

const daSocket = io('http://socket.donationalerts.ru', { reconnection: true });
daSocket.emit('add-user', { token: config.token.DONATIONALERTS, type: "minor" });

const slSocket = io(`https://sockets.streamlabs.com?token=${config.token.STREAMLABS}`, {
    transports: ['websocket']
});

daSocket.on('connect', () => console.log('connected to DA.'));
daSocket.on('donation', (msgString) => {
    console.log('DA donation:', msgString);
    const msg = JSON.parse(msgString);

    // anti-duplicate checker
    if (processedDonationIds.has(msg.id)) {
        console.log(`duplicate donation event ignored. ID: ${msg.id}`);
        return;
    }
    processedDonationIds.add(msg.id);
    setTimeout(() => {
        processedDonationIds.delete(msg.id);
    }, 60000);

    const currencyMap = {
        "EUR": "Евр.",
        "KZT": "Тг.",
        "USD": "Дол.",
        "TRY": "Лир.",
        "PLN": "Злот.",
        "RUB": "Руб.",
        "BYN": "Б.руб.",
        "UAH": "Грн."
    };
    const cur = currencyMap[msg.currency] || msg.currency;
    const roundedAmount = Math.round(parseFloat(msg.amount));
    addEvent('donation', msg.username, `+${roundedAmount} ${cur}`);
});

slSocket.on('connect', () => console.log('connected to streamlabs.'));
slSocket.on('event', (eventData) => {
    console.log('SL Event:', eventData);
    const message = eventData.message[0];
    switch (eventData.type) {
        case 'follow':
            addEvent('follow', message.name, '+follow');
            break;
        case 'subscription':
            const subText = message.months > 1 ? `${message.months}m` : '+sub';
            addEvent('subscription', message.name, subText);
            break;
        case 'donation':
            addEvent('donation', message.from, `+${message.amount}${message.currency}`);
            break;
        case 'raid':
            addEvent('raid', message.name, `+${message.raiders} raiders`);
            break;
        case 'bits':
            addEvent('bits', message.name, `+${message.amount} bits`);
            break;
        case 'host':
            addEvent('host', message.name, `+${message.viewers} viewers`)
            break;
    }
});

function addEvent(type, username, details) {
    if (eventList.children.length >= 4) {
        const oldestEvent = eventList.firstChild;
        oldestEvent.classList.add('disappearing-event');
        oldestEvent.addEventListener('animationend', () => oldestEvent.remove(), { once: true });
    }

    const eventElement = document.createElement('div');
    eventElement.classList.add('event', 'new-event-animation');

    eventElement.innerHTML = `
        <span class="username">${username}</span>
        <span class="details">${details}</span>
    `;

    eventList.appendChild(eventElement);
    updateEventOpacities();

    eventElement.addEventListener('animationend', () => {
        eventElement.classList.remove('new-event-animation');
    }, { once: true });
}

function updateEventOpacities() {
    const events = eventList.children;
    for (let i = 0; i < events.length; i++) {
        const eventElement = events[i];
        let opacity = 1;

        const positionFromLast = events.length - 1 - i;
        if (positionFromLast === 1) {
            opacity = 0.5;
        } else if (positionFromLast === 2) {
            opacity = 0.3;
        } else if (positionFromLast === 3) {
            opacity = 0.2;
        } else if (positionFromLast > 3) {
            opacity = 0.1;
        }
        eventElement.style.opacity = opacity;
        if (positionFromLast === 0) {
            eventElement.style.backgroundColor = `rgba(55, 61, 89, 0.75)`;
        } else {
            eventElement.style.backgroundColor = `transparent`;
        }
    }
}