// AI Logic for Gremios

class AIPlayer {
    constructor(difficulty = 'medium') {
        this.difficulty = difficulty; // 'easy', 'medium', 'hard'
    }

    // Main decision-making function for AI turn
    makeDecision(game, player) {
        const decisions = [];

        // Evaluate possible actions based on difficulty
        switch (this.difficulty) {
            case 'easy':
                decisions.push(...this.easyStrategy(game, player));
                break;
            case 'medium':
                decisions.push(...this.mediumStrategy(game, player));
                break;
            case 'hard':
                decisions.push(...this.hardStrategy(game, player));
                break;
        }

        return decisions;
    }

    easyStrategy(game, player) {
        // Simple random strategy with basic logic
        const actions = [];

        // Randomly invest in a guild if possible
        if (player.coins >= 2 && !player.investedInGuildThisTurn && Math.random() > 0.5) {
            const availableGuilds = game.activeGuilds; // Can invest in blocked guilds too
            if (availableGuilds.length > 0) {
                const randomGuild = availableGuilds[Math.floor(Math.random() * availableGuilds.length)];
                actions.push({ action: 'invest-guild', guild: randomGuild.number });
            }
        }

        // Randomly buy land if possible
        if (player.coins >= 2 && Math.random() > 0.5) {
            actions.push({ action: 'buy-land' });
        }

        // Cultivate land if has uncultivated lands
        if (player.coins >= 1 && player.getUncultivatedLandIndices().length > 0 && Math.random() > 0.5) {
            const indices = player.getUncultivatedLandIndices();
            actions.push({ action: 'cultivate-land', landIndex: indices[0] });
        }

        // Build inn if has enough coins and lands
        if (player.coins >= 6 && player.getUncultivatedLandsCount() > 0 && Math.random() > 0.7) {
            actions.push({ action: 'build-inn', landIndex: 0 });
        }

        return actions;
    }

    mediumStrategy(game, player) {
        // Balanced strategy: prioritize VP generation
        const actions = [];

        // 1. Try to become max investor in guilds with high probability
        if (player.coins >= 2 && !player.investedInGuildThisTurn) {
            const bestGuild = this.findBestGuildToInvest(game, player);
            if (bestGuild) {
                actions.push({ action: 'invest-guild', guild: bestGuild.number });
            }
        }

        // 2. Artisan: Buy treasures strategically
        if (player.character && player.character.id === 'artisan' &&
            player.coins >= 4 && !player.usedArtisanTreasureAbility) {
            // Buy treasure if we have spare coins
            if (player.coins >= 8) {
                actions.push({ action: 'buy-treasure' });
            }
        }

        // 3. Mercenary: Use mutiny ability strategically
        if (player.character && player.character.id === 'mercenary' &&
            player.coins >= 1 && !player.usedMutinyAbility) {
            const mutinyTarget = this.findMutinyTarget(game, player);
            if (mutinyTarget) {
                actions.push({ action: 'cause-mutiny', guild: mutinyTarget.number });
            }
        }

        // 4. Build inn if profitable (has lands and enough coins)
        const innCost = player.character && player.character.innCost ? player.character.innCost : 6;
        if (player.coins >= innCost && player.getUncultivatedLandsCount() > 2) {
            // Prioritize cultivated lands for inn
            const cultivatedIndex = player.lands.findIndex(l => l.cultivated);
            const landIndex = cultivatedIndex >= 0 ? cultivatedIndex : 0;
            actions.push({ action: 'build-inn', landIndex });
        }

        // 5. Cultivate lands for Good Harvest
        if (player.coins >= 1 && player.getUncultivatedLandIndices().length > 0) {
            const indices = player.getUncultivatedLandIndices();
            actions.push({ action: 'cultivate-land', landIndex: indices[0] });
        }

        // 6. Buy land for future inns/cultivation
        if (player.coins >= 2 && player.getUncultivatedLandsCount() < 4) {
            actions.push({ action: 'buy-land' });
        }

        // 6. Invest in expedition if has spare coins
        if (player.coins >= 2 && !player.investedInExpeditionThisTurn && Math.random() > 0.6) {
            actions.push({ action: 'invest-expedition' });
        }

        // 7. Repair destroyed inns
        if (player.coins >= 1 && player.getDestroyedInnIndices().length > 0) {
            const indices = player.getDestroyedInnIndices();
            actions.push({ action: 'repair-inn', innIndex: indices[0] });
        }

        return actions;
    }

    hardStrategy(game, player) {
        // Advanced strategy: maximize VP and adapt to game state
        const actions = [];
        const currentVP = player.getVictoryPoints(game);

        // 1. Check if close to winning - focus on VP
        if (currentVP >= 7) {
            return this.closingStrategy(game, player);
        }

        // 2. Strategic guild investments
        const maxInvestments = (player.character && player.character.additionalInvestment) ? 3 : 2;
        const canInvestInGuild = player.investmentsThisTurn < maxInvestments &&
                                 (!player.investedInGuildThisTurn || (player.character && player.character.additionalInvestment));

        if (player.coins >= 2 && canInvestInGuild) {
            const guilds = this.analyzeGuildOpportunities(game, player);
            if (guilds.length > 0) {
                // Invest in best guild
                actions.push({ action: 'invest-guild', guild: guilds[0].number });

                // If merchant with additional investment, consider investing more
                if (player.character && player.character.additionalInvestment && player.coins >= 4 &&
                    player.investmentsThisTurn < maxInvestments - 1) {
                    if (guilds.length > 1) {
                        actions.push({ action: 'invest-guild', guild: guilds[1].number });
                    }
                }
            }
        }

        // 3. Build inns strategically
        const innCost = player.character && player.character.innCost ? player.character.innCost : 6;
        if (player.coins >= innCost + 2 && player.lands.length > 0) {
            // Keep some coins for future investments
            const landIndex = player.lands.findIndex(l => l.cultivated) || 0;
            actions.push({ action: 'build-inn', landIndex });
        }

        // 4. Economic engine: lands and cultivation
        if (player.coins >= 3) {
            const uncultivatedIndices = player.getUncultivatedLandIndices();
            if (uncultivatedIndices.length > 0) {
                actions.push({ action: 'cultivate-land', landIndex: uncultivatedIndices[0] });
            } else if (player.lands.length < 3) {
                actions.push({ action: 'buy-land' });
            }
        }

        // 5. Expedition for treasures (if low VP from guilds)
        const guildVP = this.countGuildVP(game, player);
        if (guildVP < 3 && player.coins >= 2 && !player.investedInExpeditionThisTurn) {
            actions.push({ action: 'invest-expedition' });
        }

        // 6. Repair inns (2 VP each)
        if (player.coins >= 1 && player.getDestroyedInnIndices().length > 0) {
            const indices = player.getDestroyedInnIndices();
            actions.push({ action: 'repair-inn', innIndex: indices[0] });
        }

        return actions;
    }

    closingStrategy(game, player) {
        // When close to winning, focus purely on getting to 10 VP
        const actions = [];
        const currentVP = player.getVictoryPoints(game);
        const needed = 10 - currentVP;

        if (needed <= 0) {
            return actions; // Already won
        }

        // Priority 1: Repair inns (2 VP each)
        if (player.coins >= 1 && player.getDestroyedInnIndices().length > 0) {
            const indices = player.getDestroyedInnIndices();
            for (let i = 0; i < Math.min(indices.length, Math.ceil(needed / 2)); i++) {
                actions.push({ action: 'repair-inn', innIndex: indices[i] });
            }
        }

        // Priority 2: Build inns (2 VP each)
        const innCost = player.character && player.character.innCost ? player.character.innCost : 6;
        if (player.coins >= innCost && player.lands.length > 0) {
            actions.push({ action: 'build-inn', landIndex: 0 });
        }

        // Priority 3: Secure max investor positions
        if (player.coins >= 2 && !player.investedInGuildThisTurn) {
            const vulnerableGuilds = this.findVulnerableMaxInvestorPositions(game, player);
            if (vulnerableGuilds.length > 0) {
                actions.push({ action: 'invest-guild', guild: vulnerableGuilds[0].number });
            } else {
                // Try to steal max investor from others
                const stealableGuilds = this.findStealableGuilds(game, player);
                if (stealableGuilds.length > 0) {
                    actions.push({ action: 'invest-guild', guild: stealableGuilds[0].number });
                }
            }
        }

        return actions;
    }

    // Helper functions

    findBestGuildToInvest(game, player) {
        const availableGuilds = game.activeGuilds; // Can invest in blocked guilds
        if (availableGuilds.length === 0) return null;

        // Score each guild
        const scored = availableGuilds.map(guild => {
            let score = 0;

            // Prefer guilds where we can become max investor
            const playerInvestments = guild.investments.filter(inv => inv.playerId === player.id).length;
            const maxInvestments = Math.max(...game.players.map(p =>
                guild.investments.filter(inv => inv.playerId === p.id).length
            ));

            if (playerInvestments === maxInvestments) {
                score += 10; // We're tied or leading
            } else if (playerInvestments === maxInvestments - 1) {
                score += 5; // Close to leading
            }

            // Prefer guilds with higher numbers (less likely to roll)
            score += guild.number / 12 * 3;

            // Prefer guilds with fewer total investments
            score += (10 - guild.investments.length) / 10 * 2;

            return { guild, score };
        });

        scored.sort((a, b) => b.score - a.score);
        return scored[0].guild;
    }

    analyzeGuildOpportunities(game, player) {
        const availableGuilds = game.activeGuilds; // Can invest in blocked guilds

        const scored = availableGuilds.map(guild => {
            let score = 0;

            const playerInvestments = guild.investments.filter(inv => inv.playerId === player.id).length;
            const maxInvestments = Math.max(0, ...game.players.map(p =>
                guild.investments.filter(inv => inv.playerId === p.id).length
            ));

            // Heavily favor becoming max investor
            if (guild.maxInvestor === player.id) {
                score += 15; // Already max investor
            } else if (playerInvestments === maxInvestments) {
                score += 20; // Can become max investor
            } else if (playerInvestments === maxInvestments - 1) {
                score += 12; // Close to max investor
            }

            // Favor guilds with numbers that generate coins often
            const favorableNumbers = [6, 7, 8]; // Most common rolls
            if (favorableNumbers.includes(guild.number)) {
                score += 5;
            }

            return { guild, score };
        });

        scored.sort((a, b) => b.score - a.score);
        return scored.map(s => s.guild);
    }

    countGuildVP(game, player) {
        let vp = 0;
        for (let guild of game.activeGuilds) {
            if (guild.maxInvestor === player.id) {
                vp += 1;
            }
        }
        return vp;
    }

    findVulnerableMaxInvestorPositions(game, player) {
        return game.activeGuilds.filter(guild => {
            if (guild.maxInvestor !== player.id) return false;

            const playerInvestments = guild.investments.filter(inv => inv.playerId === player.id).length;
            const othersMax = Math.max(0, ...game.players
                .filter(p => p.id !== player.id)
                .map(p => guild.investments.filter(inv => inv.playerId === p.id).length)
            );

            return playerInvestments <= othersMax + 1; // Vulnerable if others are close
        });
    }

    findStealableGuilds(game, player) {
        return game.activeGuilds.filter(guild => {
            if (guild.maxInvestor === player.id) return false;

            const playerInvestments = guild.investments.filter(inv => inv.playerId === player.id).length;
            const currentMaxInvestments = Math.max(0, ...game.players.map(p =>
                guild.investments.filter(inv => inv.playerId === p.id).length
            ));

            return playerInvestments >= currentMaxInvestments - 1; // Can steal with 1-2 investments
        });
    }

    // Helper: Find best guild to cause mutiny (for Mercenary)
    findMutinyTarget(game, player) {
        // Find guilds where:
        // 1. Player has invested
        // 2. Other players have more investments (causing mutiny helps player relatively)
        const guildsWithInvestments = game.activeGuilds.filter(guild => {
            const playerInv = guild.investments.filter(inv => inv.playerId === player.id).length;
            if (playerInv === 0) return false;

            // Check if others have more than 1 investment
            for (let p of game.players) {
                if (p.id !== player.id) {
                    const otherInv = guild.investments.filter(inv => inv.playerId === p.id).length;
                    if (otherInv > 1) {
                        return true; // Good target - they will lose investment
                    }
                }
            }
            return false;
        });

        if (guildsWithInvestments.length > 0) {
            // Prefer guilds where player is NOT max investor but others will lose investments
            return guildsWithInvestments[0];
        }

        return null;
    }

    // Select character for AI
    selectCharacter(options) {
        // Prefer certain characters based on strategy
        const preferred = ['merchant', 'master_builder', 'mercenary', 'governor', 'pirate'];

        for (let charId of preferred) {
            const found = options.find(opt => opt.id === charId);
            if (found) return found;
        }

        // Otherwise pick randomly
        return options[Math.floor(Math.random() * options.length)];
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AIPlayer };
}
