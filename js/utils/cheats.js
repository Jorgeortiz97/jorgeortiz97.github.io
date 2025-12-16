// Cheat functions for testing - accessible from browser console
// Usage: Open browser console and call functions like: Cheats.addCoins(10)

const Cheats = {
    // Get the current game instance
    getGame() {
        const gameScene = window.game?.scene?.getScene('GameScene');
        if (!gameScene || !gameScene.game_instance) {
            console.error('Game not running. Start a game first.');
            return null;
        }
        return gameScene.game_instance;
    },

    // Get human player (always player 0)
    getPlayer(playerId = 0) {
        const game = this.getGame();
        if (!game) return null;
        return game.players[playerId];
    },

    // Refresh UI after changes
    refreshUI() {
        const gameScene = window.game?.scene?.getScene('GameScene');
        if (gameScene) {
            gameScene.updateAllUI();
        }
    },

    // Add coins to player
    addCoins(amount = 10, playerId = 0) {
        const player = this.getPlayer(playerId);
        if (!player) return;
        player.addCoins(amount);
        this.refreshUI();
        console.log(`Added ${amount} coins to ${player.name}. Total: ${player.coins}`);
    },

    // Set coins to exact amount
    setCoins(amount, playerId = 0) {
        const player = this.getPlayer(playerId);
        if (!player) return;
        player.coins = amount;
        this.refreshUI();
        console.log(`Set ${player.name}'s coins to ${amount}`);
    },

    // Add treasure card
    addTreasure(type = 'random', playerId = 0) {
        const game = this.getGame();
        const player = this.getPlayer(playerId);
        if (!player || !game) return;

        let treasure;
        if (type === 'random' && game.treasureDeck.length > 0) {
            treasure = game.treasureDeck.pop();
        } else {
            // Create a treasure based on type
            const treasureTypes = {
                'wealth': { type: 'WEALTH', nameES: 'Riquezas', vp: 0, coinValue: 3 },
                'common': { type: 'COMMON', nameES: 'Tesoro Comun', vp: 1 },
                'rare': { type: 'RARE', nameES: 'Tesoro Raro', vp: 2 }
            };
            treasure = treasureTypes[type] || treasureTypes['common'];
        }

        player.addTreasure(treasure);
        this.refreshUI();
        console.log(`Added treasure to ${player.name}:`, treasure);
    },

    // Add land (uncultivated)
    addLand(playerId = 0) {
        const player = this.getPlayer(playerId);
        if (!player) return;
        player.lands.push(new ResourceCard('land', false));
        this.refreshUI();
        console.log(`Added uncultivated land to ${player.name}. Total lands: ${player.lands.length}`);
    },

    // Add cultivated land
    addCultivatedLand(playerId = 0) {
        const player = this.getPlayer(playerId);
        if (!player) return;
        player.lands.push(new ResourceCard('land', true));
        this.refreshUI();
        console.log(`Added cultivated land to ${player.name}. Total lands: ${player.lands.length}`);
    },

    // Add inn
    addInn(destroyed = false, playerId = 0) {
        const player = this.getPlayer(playerId);
        if (!player) return;
        player.inns.push(new ResourceCard('inn', false, destroyed));
        this.refreshUI();
        console.log(`Added ${destroyed ? 'destroyed ' : ''}inn to ${player.name}. Total inns: ${player.inns.length}`);
    },

    // End current turn
    endTurn() {
        const game = this.getGame();
        if (!game) return;
        game.endTurn();
        console.log('Turn ended. Now player:', game.currentPlayerIndex);
    },

    // Skip to human player's turn
    skipToHumanTurn() {
        const game = this.getGame();
        if (!game) return;
        while (game.currentPlayerIndex !== 0 && game.phase !== 'game-over') {
            game.endTurn();
        }
        console.log('Skipped to human player turn');
    },

    // Show current game state
    status() {
        const game = this.getGame();
        if (!game) return;

        console.log('=== GAME STATUS ===');
        console.log('Phase:', game.phase);
        console.log('Round:', game.round);
        console.log('Current Player:', game.currentPlayerIndex);
        console.log('');

        game.players.forEach((player, i) => {
            const uncultivated = player.lands.filter(l => !l.cultivated).length;
            const cultivated = player.lands.filter(l => l.cultivated).length;
            const activeInns = player.inns.filter(i => !i.destroyed).length;
            const destroyedInns = player.inns.filter(i => i.destroyed).length;

            console.log(`Player ${i}: ${player.name} ${i === game.currentPlayerIndex ? '(ACTIVE)' : ''}`);
            console.log(`  Coins: ${player.coins}, Reserve: ${player.reserve}`);
            console.log(`  Lands: ${uncultivated} uncultivated, ${cultivated} cultivated`);
            console.log(`  Inns: ${activeInns} active, ${destroyedInns} destroyed`);
            console.log(`  Treasures: ${player.treasures.length}`);
            console.log(`  VP: ${player.getVictoryPoints(game)}`);
            console.log('');
        });
    },

    // Reset turn flags (allows investing again)
    resetTurnFlags(playerId = 0) {
        const player = this.getPlayer(playerId);
        if (!player) return;
        player.resetTurnFlags();
        this.refreshUI();
        console.log(`Reset turn flags for ${player.name}`);
    },

    // Win the game instantly
    win(playerId = 0) {
        const player = this.getPlayer(playerId);
        if (!player) return;
        // Add enough treasures to win
        for (let i = 0; i < 5; i++) {
            player.addTreasure({ type: 'RARE', nameES: 'Tesoro Raro', vp: 2 });
        }
        this.refreshUI();
        const game = this.getGame();
        game.checkVictory();
        console.log(`Added 10 VP worth of treasures to ${player.name}`);
    },

    // Help - show available commands
    help() {
        console.log(`
=== CHEAT COMMANDS ===
Cheats.addCoins(amount, playerId)     - Add coins (default: 10 coins to player 0)
Cheats.setCoins(amount, playerId)     - Set coins to exact amount
Cheats.addTreasure(type, playerId)    - Add treasure ('random', 'wealth', 'common', 'rare')
Cheats.addLand(playerId)              - Add uncultivated land
Cheats.addCultivatedLand(playerId)    - Add cultivated land
Cheats.addInn(destroyed, playerId)    - Add inn (destroyed = true/false)
Cheats.endTurn()                      - End current turn
Cheats.skipToHumanTurn()              - Skip AI turns to human player
Cheats.resetTurnFlags(playerId)       - Reset investment limits for turn
Cheats.status()                       - Show game state
Cheats.win(playerId)                  - Add enough VP to win
Cheats.help()                         - Show this help

Player IDs: 0 = Human, 1 = AI 1, 2 = AI 2
        `);
    }
};

// Auto-show help when loaded
console.log('Cheats loaded! Type Cheats.help() for available commands.');
