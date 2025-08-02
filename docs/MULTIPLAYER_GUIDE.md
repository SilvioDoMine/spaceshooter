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

#### Depois (Multiplayer Ready com Monorepo)
```javascript
// packages/client/src/entities/PlayerClient.js
import { Player } from '@spaceshooter/shared';
import { NetworkClient } from '../network/NetworkClient.js';

class PlayerClient extends Player {
  update(deltaTime) {
    this.handleInput();                    // Captura input
    NetworkClient.sendInput(this.input);  // Envia para servidor
    this.predictMovement(deltaTime);       // Predição local
    this.render();                        // Renderização
  }
}

// packages/server/src/entities/PlayerServer.js
import { Player } from '@spaceshooter/shared';

class PlayerServer extends Player {
  update(deltaTime, inputs) {
    this.processInputs(inputs);    // Processa inputs
    this.updatePosition(deltaTime); // Física autoritativa
    this.checkCollisions();       // Colisão autoritativa
    this.broadcastState();        // Envia estado
  }
}

// packages/shared/src/entities/Player.js
export class Player {
  constructor() {
    this.position = { x: 0, y: 0, z: 0 };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.health = 100;
  }
  
  // Lógica compartilhada cliente/servidor
  applyInput(input, deltaTime) {
    // Implementação compartilhada
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

### WebSockets com Monorepo

**packages/server/src/NetworkManager.js:**
```javascript
import { WebSocketServer } from 'ws';
import { InputCommand } from '@spaceshooter/shared';

class NetworkManager {
  constructor(gameServer) {
    this.gameServer = gameServer;
    this.wss = new WebSocketServer({ port: 8080 });
    this.clients = new Map();
  }
  
  start() {
    this.wss.on('connection', (ws) => {
      const playerId = this.generatePlayerId();
      this.clients.set(playerId, ws);
      
      ws.on('message', (data) => {
        const message = JSON.parse(data);
        this.handleMessage(playerId, message);
      });
      
      ws.on('close', () => {
        this.clients.delete(playerId);
        this.gameServer.removePlayer(playerId);
      });
    });
  }
}
```

**packages/client/src/NetworkClient.js:**
```javascript
import { InputCommand } from '@spaceshooter/shared';

class NetworkClient {
  constructor() {
    this.ws = new WebSocket('ws://localhost:8080');
    this.playerId = null;
  }
  
  connect() {
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleServerMessage(message);
    };
  }
  
  sendInput(inputCommand) {
    this.ws.send(JSON.stringify({
      type: 'player:input',
      data: inputCommand.serialize()
    }));
  }
}
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

### Estrutura do Servidor no Monorepo

**packages/server/src/GameServer.js:**
```javascript
import { GameState, Player } from '@spaceshooter/shared';
import { WebSocketServer } from 'ws';

class GameServer {
  constructor() {
    this.gameState = new GameState();
    this.players = new Map();
    this.rooms = new Map();
    this.tickRate = 60;
    this.wss = new WebSocketServer({ port: 8080 });
  }
  
  start() {
    this.setupWebSocketHandlers();
    setInterval(() => {
      this.update();
    }, 1000 / this.tickRate);
  }
  
  setupWebSocketHandlers() {
    this.wss.on('connection', (ws) => {
      ws.on('message', (data) => {
        const message = JSON.parse(data);
        this.handleMessage(ws, message);
      });
    });
  }
  
  update() {
    this.processAllInputs();
    this.updateGameLogic();
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

## Implementação por Fases no Monorepo

### Fase 1: Setup do Monorepo
1. **Configurar Yarn Workspaces**
   ```bash
   yarn install
   yarn workspace @spaceshooter/shared build
   ```

2. **Mover código comum para shared**
   - Entidades (Player, Enemy, Projectile)
   - Componentes (Transform, Health)
   - Utils e tipos TypeScript

3. **Setup básico cliente/servidor**
   ```bash
   yarn dev:client  # Roda Vite
   yarn dev:server  # Roda Node.js
   ```

### Fase 2: Networking Foundation
1. **WebSocket server** em `packages/server/`
2. **Cliente WebSocket** em `packages/client/`
3. **Protocolo compartilhado** em `packages/shared/`
4. **Sistema de rooms** básico

### Fase 3: Game Logic Distribution
1. **Física no servidor** usando `@spaceshooter/shared`
2. **Input commands** definidos em shared
3. **Client-side prediction** no cliente
4. **State synchronization**

### Fase 4: Otimizações
1. **Lag compensation**
2. **Delta compression** 
3. **Interest management**
4. **Reconnection handling**

### Fase 5: Features Avançadas
1. **Spectator mode**
2. **Replay system**
3. **Anti-cheat measures**
4. **Matchmaking API**

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

## Comandos de Desenvolvimento

```bash
# Instalar dependências
yarn install

# Desenvolvimento (cliente + servidor)
yarn dev

# Apenas cliente
yarn dev:client

# Apenas servidor  
yarn dev:server

# Build completo
yarn build

# Testes
yarn test
```

## Estrutura de Arquivos Final

```
spaceshooter/
├── packages/
│   ├── shared/
│   │   └── src/
│   │       ├── entities/     # Player, Enemy, Projectile
│   │       ├── components/   # Transform, Health, Movement
│   │       ├── physics/      # CollisionDetector, Physics
│   │       ├── network/      # InputCommand, Protocol
│   │       └── types/        # TypeScript interfaces
│   ├── client/
│   │   └── src/
│   │       ├── systems/      # Rendering, Input, Audio
│   │       ├── network/      # NetworkClient
│   │       └── ui/           # Interface
│   └── server/
│       └── src/
│           ├── systems/      # GameServer, NetworkManager
│           ├── rooms/        # RoomManager
│           └── api/          # REST endpoints
└── package.json             # Workspace config
```

## Próximos Passos

1. **Configurar monorepo** com Yarn Workspaces
2. **Mover código para packages/shared**
3. **Implementar cliente básico** 
4. **Implementar servidor básico**
5. **Testar comunicação local**
6. **Deploy e teste de latência**

A estrutura monorepo facilita o compartilhamento de código e desenvolvimento paralelo cliente/servidor.