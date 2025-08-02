# Guia de Preparação para Multiplayer

## Visão Geral da Transição

A arquitetura atual foi desenhada pensando na futura implementação multiplayer. Esta documentação detalha como fazer a transição do single player para multiplayer.

## Conceitos Fundamentais

### Client-Server vs Peer-to-Peer
**Recomendação**: Client-Server para melhor controle e anti-cheat

**Vantagens Client-Server**:
- Autoridade central (anti-cheat)
- Melhor sincronização
- Escalabilidade

**Desvantagens**:
- Latência adicional
- Custos de servidor
- Complexidade maior

### Arquitetura de Rede Recomendada
```
Cliente 1 ←→ Servidor ←→ Cliente 2
Cliente 3 ←→         ←→ Cliente 4
```

## Refatoração Necessária

### 1. Separação de Lógica

#### Antes (Single Player)
```javascript
class Player {
  update(deltaTime) {
    this.handleInput();      // Input direto
    this.updatePosition();   // Física local
    this.checkCollisions(); // Colisão local
    this.render();          // Renderização
  }
}
```

#### Depois (Multiplayer Ready)
```javascript
// Cliente
class PlayerClient {
  update(deltaTime) {
    this.handleInput();        // Captura input
    this.sendInputToServer();  // Envia para servidor
    this.predictMovement();    // Predição local
    this.render();            // Renderização
  }
}

// Servidor
class PlayerServer {
  update(deltaTime, inputs) {
    this.processInputs(inputs);  // Processa inputs
    this.updatePosition();       // Física autoritativa
    this.checkCollisions();     // Colisão autoritativa
    this.broadcastState();      // Envia estado
  }
}
```

### 2. Sistema de Estados Determinístico

#### Game State Serializable
```javascript
class GameState {
  constructor() {
    this.players = new Map();
    this.enemies = [];
    this.projectiles = [];
    this.timestamp = 0;
    this.frame = 0;
  }
  
  // Serialização para rede
  serialize() {
    return {
      players: Array.from(this.players.entries()),
      enemies: this.enemies.map(e => e.serialize()),
      projectiles: this.projectiles.map(p => p.serialize()),
      timestamp: this.timestamp,
      frame: this.frame
    };
  }
  
  // Deserialização da rede
  deserialize(data) {
    this.players = new Map(data.players);
    this.enemies = data.enemies.map(e => Enemy.deserialize(e));
    this.projectiles = data.projectiles.map(p => Projectile.deserialize(p));
    this.timestamp = data.timestamp;
    this.frame = data.frame;
  }
}
```

### 3. Sistema de Input Network-Ready

#### Input Commands
```javascript
class InputCommand {
  constructor(playerId, type, data, timestamp) {
    this.playerId = playerId;
    this.type = type; // 'move', 'shoot', 'stop'
    this.data = data; // direction, position, etc
    this.timestamp = timestamp;
    this.frame = 0;   // Frame number
  }
}

// Exemplos de inputs
const moveCommand = new InputCommand(
  'player1', 
  'move', 
  { direction: { x: 1, y: 0 } }, 
  Date.now()
);

const shootCommand = new InputCommand(
  'player1', 
  'shoot', 
  { position: { x: 0, y: 0 }, direction: { x: 0, y: 1 } }, 
  Date.now()
);
```

## Tecnologias de Networking

### WebSockets (Recomendado)
```javascript
// Servidor (Node.js + Socket.io)
const io = require('socket.io')(3000);

io.on('connection', (socket) => {
  socket.on('player:input', (inputCommand) => {
    // Processar input do jogador
    gameServer.processInput(socket.id, inputCommand);
  });
  
  socket.on('join:room', (roomId) => {
    socket.join(roomId);
  });
});

// Cliente
const socket = io('ws://localhost:3000');

socket.on('game:state', (gameState) => {
  game.updateFromServer(gameState);
});

socket.emit('player:input', inputCommand);
```

### WebRTC (Para P2P - Futuro)
```javascript
// Para comunicação direta entre clientes
// Mais complexo, mas menor latência
const peerConnection = new RTCPeerConnection();
```

## Sincronização e Predição

### Client-Side Prediction
```javascript
class PredictivePlayer {
  constructor() {
    this.serverPosition = new THREE.Vector3();
    this.predictedPosition = new THREE.Vector3();
    this.inputHistory = [];
  }
  
  // Prediz movimento localmente
  predictMovement(input, deltaTime) {
    this.predictedPosition.copy(this.serverPosition);
    // Aplica todos os inputs desde último update do servidor
    this.inputHistory.forEach(cmd => {
      this.applyInput(cmd, deltaTime);
    });
  }
  
  // Reconcilia com estado do servidor
  reconcileWithServer(serverState) {
    this.serverPosition.copy(serverState.position);
    // Re-executa inputs não confirmados
    this.replayInputs(serverState.lastConfirmedInput);
  }
}
```

### Server Reconciliation
```javascript
class GameServer {
  processInput(playerId, inputCommand) {
    const player = this.players.get(playerId);
    
    // Aplica input
    this.applyInput(player, inputCommand);
    
    // Confirma input processado
    this.sendToClient(playerId, {
      type: 'input:confirmed',
      inputId: inputCommand.id,
      newState: player.serialize()
    });
  }
}
```

### Lag Compensation
```javascript
class LagCompensation {
  // Rollback para o tempo do input do cliente
  static rollbackToTime(gameState, timestamp) {
    const targetTime = timestamp - NETWORK_DELAY_ESTIMATE;
    // Recria estado do jogo no momento do input
    return this.interpolateState(gameState, targetTime);
  }
}
```

## Estrutura do Servidor

### Servidor Básico (Node.js)
```javascript
// server/GameServer.js
class GameServer {
  constructor() {
    this.gameState = new GameState();
    this.players = new Map();
    this.rooms = new Map();
    this.tickRate = 60; // Updates por segundo
  }
  
  start() {
    setInterval(() => {
      this.update();
    }, 1000 / this.tickRate);
  }
  
  update() {
    // Processa inputs de todos os jogadores
    this.processAllInputs();
    
    // Atualiza física do jogo
    this.updateGameLogic();
    
    // Envia estado para todos os clientes
    this.broadcastGameState();
  }
}
```

### Room System
```javascript
class Room {
  constructor(id, maxPlayers = 4) {
    this.id = id;
    this.players = new Map();
    this.maxPlayers = maxPlayers;
    this.gameState = new GameState();
    this.status = 'waiting'; // waiting, playing, finished
  }
  
  addPlayer(playerId, playerData) {
    if (this.players.size >= this.maxPlayers) {
      return false;
    }
    
    this.players.set(playerId, playerData);
    
    if (this.players.size === this.maxPlayers) {
      this.startGame();
    }
    
    return true;
  }
  
  startGame() {
    this.status = 'playing';
    this.broadcastToAll({
      type: 'game:start',
      gameState: this.gameState.serialize()
    });
  }
}
```

## Otimizações de Rede

### Delta Compression
```javascript
class DeltaCompression {
  static createDelta(oldState, newState) {
    const delta = {};
    
    // Só inclui campos que mudaram
    if (oldState.position !== newState.position) {
      delta.position = newState.position;
    }
    
    if (oldState.health !== newState.health) {
      delta.health = newState.health;
    }
    
    return delta;
  }
}
```

### Interest Management
```javascript
class InterestManager {
  // Só envia dados relevantes para cada cliente
  static getRelevantEntities(player, allEntities) {
    const viewDistance = 20;
    
    return allEntities.filter(entity => {
      const distance = player.position.distanceTo(entity.position);
      return distance <= viewDistance;
    });
  }
}
```

### Update Frequency Optimization
```javascript
// Diferentes frequências para diferentes dados
const UPDATE_RATES = {
  position: 20,    // 20 FPS para posições
  health: 10,      // 10 FPS para vida
  score: 2         // 2 FPS para pontuação
};
```

## Implementação por Fases

### Fase 1: Networking Foundation
1. Configurar WebSocket server básico
2. Implementar comunicação cliente-servidor
3. Sistema de rooms simples
4. Sincronização básica de posição

### Fase 2: Game Logic Distribution
1. Mover física para servidor
2. Implementar input commands
3. Client-side prediction básica
4. Server reconciliation

### Fase 3: Otimizações
1. Lag compensation
2. Delta compression
3. Interest management
4. Reconnection handling

### Fase 4: Features Avançadas
1. Spectator mode
2. Replay system
3. Anti-cheat measures
4. Matchmaking

## Considerações de Deploy

### Infraestrutura
- **Desenvolvimento**: Local server
- **Produção**: AWS/GCP/Azure
- **CDN**: Para assets estáticos
- **Load Balancer**: Para múltiplos servers

### Monitoramento
```javascript
// Métricas importantes
const metrics = {
  playersOnline: 0,
  averageLatency: 0,
  packetsPerSecond: 0,
  errorRate: 0,
  roomsActive: 0
};
```

### Escalabilidade
- Horizontal scaling com múltiplos game servers
- Database para persistência de dados
- Redis para cache e sessões
- Message queue para comunicação entre servers

## Próximos Passos

1. **Completar single player primeiro**
2. **Implementar networking foundation**
3. **Refatorar código existente**
4. **Testar com múltiplos clientes locais**
5. **Deploy e teste de latência**

A transição deve ser gradual, mantendo sempre uma versão funcional do jogo.