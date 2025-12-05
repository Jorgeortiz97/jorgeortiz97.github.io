// ui-board.js - Board display functionality

const UIBoard = {
    ui: null,
    game: null,

    init(uiController) {
        this.ui = uiController;
        this.game = uiController.game;
    },

    renderInvestmentSlots(investments, maxSlots = 4) {
        let html = '';
        for (let i = 0; i < maxSlots; i++) {
            if (i < investments.length) {
                const coinImage = getCoinImageFromColor(investments[i].color);
                html += `<div class="investment-slot filled" style="background-image: url('${coinImage}'); background-size: cover; background-position: center; background-repeat: no-repeat;"></div>`;
            } else {
                html += `<div class="investment-slot"></div>`;
            }
        }
        return html;
    },

    getGuildImageFromNumber(guildNumber) {
        const guildImages = {
            2: 'resources/guilds/Church.png',
            3: 'resources/guilds/Blacksmith.png',
            4: 'resources/guilds/Quarry.png',
            5: 'resources/guilds/Port.png',
            6: 'resources/guilds/Farm.png',
            8: 'resources/guilds/Tavern.png',
            9: 'resources/guilds/Market.png',
            10: 'resources/guilds/Sawmill.png',
            11: 'resources/guilds/Jewelers.png',
            12: 'resources/guilds/Monastery.png'
        };
        return guildImages[guildNumber] || null;
    },

    getEventBackgroundImage(eventIdOrEvent) {
        let eventId;

        if (typeof eventIdOrEvent === 'object' && eventIdOrEvent !== null) {
            if (eventIdOrEvent.id === 'guild_foundation' && eventIdOrEvent.guildNumber) {
                return this.getGuildImageFromNumber(eventIdOrEvent.guildNumber);
            }
            eventId = eventIdOrEvent.id;
        } else {
            eventId = eventIdOrEvent;
        }

        const eventImages = {
            'good_harvest': 'resources/action_events/good_harvest.png',
            'bad_harvest': 'resources/action_events/bad_harvest.png',
            'prosperity': 'resources/action_events/prosperity.png',
            'bankruptcy': 'resources/action_events/bankruptcy.png',
            'tax_collection': 'resources/action_events/tax_collection.png',
            'expropriation': 'resources/action_events/expropriation.png',
            'expedition': 'resources/action_events/expedition.png',
            'invasion': 'resources/action_events/invasion.png',
            'mutiny': 'resources/action_events/mutiny.png',
            'plague': 'resources/blocking_events/Plague.png',
            'famine': 'resources/blocking_events/Famine.png',
            'mine_collapse': 'resources/blocking_events/MineCollapse.png',
            'material_shortage': 'resources/blocking_events/ResourcesOutage.png',
            'trade_blockade': 'resources/blocking_events/TradeBlock.png'
        };

        return eventImages[eventId] || null;
    },

    updateEventDeckCount() {
        const currentEventCard = document.getElementById('current-event-card');
        const currentContent = currentEventCard?.querySelector('.event-card-content');

        if (currentContent) {
            const deckCount = this.game.eventDeck ? this.game.eventDeck.length : 0;

            if (deckCount === 0) {
                currentEventCard.style.opacity = '0';
                currentEventCard.style.pointerEvents = 'none';
            } else {
                currentEventCard.style.opacity = '1';
                currentEventCard.style.pointerEvents = 'auto';
            }

            const countSpan = currentContent.querySelector('.event-deck-count span');
            if (countSpan) {
                countSpan.textContent = deckCount;
            }
        }
    },

    updateExpeditionDisplay() {
        const expeditionCard = document.getElementById('expedition-card');
        const slotsContainer = expeditionCard?.querySelector('.investment-slots');

        if (slotsContainer) {
            slotsContainer.innerHTML = this.renderInvestmentSlots(
                this.game.expedition.investments,
                this.game.expedition.maxSlots
            );
        }
    },

    updateEventDisplay(event) {
        const previousEventCard = document.getElementById('previous-event-card');
        if (!previousEventCard) return;

        const bgImage = this.getEventBackgroundImage(event);

        if (bgImage) {
            previousEventCard.style.backgroundImage = `url('${bgImage}')`;
            previousEventCard.style.backgroundSize = 'cover';
            previousEventCard.style.backgroundPosition = 'center';
            previousEventCard.classList.remove('empty');
        } else {
            previousEventCard.style.backgroundImage = '';
            previousEventCard.classList.add('empty');
        }
    },

    renderGuildCard(guild, row, column, guildsGrid) {
        if (!guild) return;

        const div = document.createElement('div');
        div.className = 'guild-card';
        div.classList.add(`guild-row-${row}`);
        div.style.gridColumn = column;
        div.dataset.guildNumber = guild.number;

        if (guild.blocked) {
            div.classList.add('blocked');
        }

        let maxInvestorHTML = '';
        if (guild.maxInvestor !== null) {
            const maxPlayer = this.game.players.find(p => p.id === guild.maxInvestor);
            if (maxPlayer) {
                const coinImage = getCoinImageFromColor(maxPlayer.color);
                maxInvestorHTML = `<div class="max-investor" style="background-image: url('${coinImage}'); background-size: cover; background-position: center; background-repeat: no-repeat;"></div>`;
            }
        }

        const slotsHTML = this.renderInvestmentSlots(guild.investments, 4);

        div.innerHTML = `
            ${maxInvestorHTML}
            <div class="investment-slots">
                ${slotsHTML}
            </div>
        `;

        guildsGrid.appendChild(div);
    },

    renderBlockingEventsRow(row1Guilds, row3Guilds, guildsGrid) {
        const blockingEventPositions = {
            'mine_collapse': { column: 2, guilds: [3, 11] },
            'material_shortage': { column: 3, guilds: [4, 10] },
            'trade_blockade': { column: 4, guilds: [5, 9] },
            'famine': { column: 5, guilds: [6, 8] },
            'plague': { column: 1, guilds: 'all' }
        };

        const eventsByColumn = {1: [], 2: [], 3: [], 4: [], 5: []};

        for (let event of this.game.activeTemporaryEvents) {
            const eventPos = blockingEventPositions[event.id];
            if (eventPos) {
                eventsByColumn[eventPos.column].push(event);
            }
        }

        for (let col = 1; col <= 5; col++) {
            const div = document.createElement('div');
            div.className = 'blocking-event-row';
            div.style.gridColumn = col;

            const eventsHere = eventsByColumn[col];

            if (eventsHere.length > 0) {
                const eventCounts = {};
                eventsHere.forEach(e => {
                    eventCounts[e.id] = (eventCounts[e.id] || 0) + 1;
                });

                const uniqueEvents = [...new Set(eventsHere.map(e => e.id))];

                let eventsHTML = '';
                uniqueEvents.forEach(eventId => {
                    const event = eventsHere.find(e => e.id === eventId);
                    const count = eventCounts[eventId];

                    eventsHTML += `
                        <div class="blocking-event-card stacked-event" data-event-id="${eventId}">
                            <div class="event-name">${event.name}</div>
                            <div class="event-count">${count > 1 ? `x${count}` : ''}</div>
                        </div>
                    `;
                });

                div.innerHTML = eventsHTML;
            }

            guildsGrid.appendChild(div);
        }
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UIBoard };
}
