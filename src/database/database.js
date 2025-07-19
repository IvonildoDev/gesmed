import * as SQLite from 'expo-sqlite';

/**
 * Classe Database - Responsável por centralizar todas as operações do banco de dados
 */
class Database {
    constructor() {
        this.db = null;
        this.isInitialized = false;
    }

    /**
     * Inicializa a conexão com o banco de dados
     */
    initDatabase = () => {
        try {
            this.db = SQLite.openDatabaseSync('gesmed.db');
            this.createTables();
            this.isInitialized = true;
            console.log('Banco de dados inicializado com sucesso!');
            return true;
        } catch (error) {
            console.error('Erro ao inicializar o banco de dados:', error);
            return false;
        }
    };

    /**
     * Cria as tabelas do banco de dados se não existirem
     */
    createTables = () => {
        try {
            // Tabela usuários
            this.db.execSync(`
        CREATE TABLE IF NOT EXISTS usuarios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome_usuario TEXT UNIQUE,
          senha TEXT
        );
      `);

            // Tabela medicamentos
            this.db.execSync(`
        CREATE TABLE IF NOT EXISTS medicamentos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          usuario_id INTEGER,
          nome TEXT,
          horario TEXT,
          quantidade TEXT,
          intervalo_horas INTEGER DEFAULT 8,
          proxima_dose TEXT,
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        );
      `);

            // Tabela histórico
            this.db.execSync(`
        CREATE TABLE IF NOT EXISTS historico (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          medicamento_id INTEGER,
          tomado_em TEXT,
          FOREIGN KEY (medicamento_id) REFERENCES medicamentos(id)
        );
      `);

            // Verificar se todas as colunas existem e adicioná-las se necessário
            this.checkAndAddColumns();

            return true;
        } catch (error) {
            console.error('Erro ao criar tabelas:', error);
            return false;
        }
    };

    /**
     * Verifica e adiciona colunas que podem estar faltando
     */
    checkAndAddColumns = () => {
        try {
            const tableInfo = this.db.getAllSync("PRAGMA table_info(medicamentos)");
            const colunas = tableInfo.map(col => col.name);

            // Adicionar novas colunas uma a uma (operações DDL não podem ser parte de transações)
            if (!colunas.includes('quantidade')) {
                this.db.execSync('ALTER TABLE medicamentos ADD COLUMN quantidade TEXT');
            }

            if (!colunas.includes('intervalo_horas')) {
                this.db.execSync('ALTER TABLE medicamentos ADD COLUMN intervalo_horas INTEGER DEFAULT 8');
            }

            if (!colunas.includes('proxima_dose')) {
                this.db.execSync('ALTER TABLE medicamentos ADD COLUMN proxima_dose TEXT');
            }

            if (!colunas.includes('total_doses')) {
                this.db.execSync('ALTER TABLE medicamentos ADD COLUMN total_doses INTEGER DEFAULT 0');
            }

            return true;
        } catch (error) {
            console.error('Erro ao verificar/adicionar colunas:', error);
            return false;
        }
    };

    // ========== OPERAÇÕES DE USUÁRIOS ==========

    /**
     * Adiciona ou atualiza um usuário
     * @param {string} nomeUsuario - Nome do usuário
     * @param {string} senha - Senha do usuário
     * @returns {object} - Objeto com o ID do usuário inserido ou atualizado
     */
    addUser = (nomeUsuario, senha) => {
        try {
            const existingUser = this.getUserByUsername(nomeUsuario);

            if (existingUser) {
                // Atualizar usuário existente
                this.db.runSync(
                    'UPDATE usuarios SET senha = ? WHERE nome_usuario = ?',
                    [senha, nomeUsuario]
                );
                return { id: existingUser.id, isNew: false };
            } else {
                // Inserir novo usuário
                this.db.runSync(
                    'INSERT INTO usuarios (nome_usuario, senha) VALUES (?, ?)',
                    [nomeUsuario, senha]
                );

                // Obter o ID do último usuário inserido
                const result = this.db.getFirstSync('SELECT last_insert_rowid() as id');
                return { id: result.id, isNew: true };
            }
        } catch (error) {
            console.error('Erro ao adicionar usuário:', error);
            throw error;
        }
    };

    /**
     * Verifica as credenciais do usuário para login
     * @param {string} nomeUsuario - Nome do usuário
     * @param {string} senha - Senha do usuário
     * @returns {object|null} - Objeto do usuário se as credenciais forem válidas, null caso contrário
     */
    loginUser = (nomeUsuario, senha) => {
        try {
            return this.db.getFirstSync(
                'SELECT * FROM usuarios WHERE nome_usuario = ? AND senha = ?',
                [nomeUsuario, senha]
            );
        } catch (error) {
            console.error('Erro ao fazer login:', error);
            throw error;
        }
    };

    /**
     * Busca um usuário pelo nome de usuário
     * @param {string} nomeUsuario - Nome do usuário
     * @returns {object|null} - Objeto do usuário ou null se não encontrado
     */
    getUserByUsername = (nomeUsuario) => {
        try {
            return this.db.getFirstSync(
                'SELECT * FROM usuarios WHERE nome_usuario = ?',
                [nomeUsuario]
            );
        } catch (error) {
            console.error('Erro ao buscar usuário:', error);
            throw error;
        }
    };

    /**
     * Busca um usuário pelo ID
     * @param {number} id - ID do usuário
     * @returns {object|null} - Objeto do usuário ou null se não encontrado
     */
    getUserById = (id) => {
        try {
            return this.db.getFirstSync('SELECT * FROM usuarios WHERE id = ?', [id]);
        } catch (error) {
            console.error('Erro ao buscar usuário por ID:', error);
            throw error;
        }
    };

    // ========== OPERAÇÕES DE MEDICAMENTOS ==========

    /**
     * Adiciona um novo medicamento
     * @param {object} medicamento - Objeto com os dados do medicamento
     * @returns {object} - Objeto com o ID do medicamento inserido
     */
    addMedicamento = (medicamento) => {
        try {
            const { usuario_id, nome, horario, quantidade, intervalo_horas, proxima_dose, total_doses } = medicamento;

            this.db.runSync(
                'INSERT INTO medicamentos (usuario_id, nome, horario, quantidade, intervalo_horas, proxima_dose, total_doses) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [usuario_id, nome, horario, quantidade, intervalo_horas, proxima_dose, total_doses || 0]
            );

            // Obter o ID do último medicamento inserido
            const result = this.db.getFirstSync('SELECT last_insert_rowid() as id');
            return { id: result.id };
        } catch (error) {
            console.error('Erro ao adicionar medicamento:', error);
            throw error;
        }
    };

    /**
     * Atualiza um medicamento existente
     * @param {object} medicamento - Objeto com os dados do medicamento
     * @returns {boolean} - true se a atualização for bem-sucedida
     */
    updateMedicamento = (medicamento) => {
        try {
            const { id, nome, horario, quantidade, intervalo_horas, proxima_dose, total_doses } = medicamento;

            this.db.runSync(
                'UPDATE medicamentos SET nome = ?, horario = ?, quantidade = ?, intervalo_horas = ?, proxima_dose = ?, total_doses = ? WHERE id = ?',
                [nome, horario, quantidade, intervalo_horas, proxima_dose, total_doses || 0, id]
            );

            return true;
        } catch (error) {
            console.error('Erro ao atualizar medicamento:', error);
            throw error;
        }
    };

    /**
     * Remove um medicamento
     * @param {number} id - ID do medicamento
     * @returns {boolean} - true se a remoção for bem-sucedida
     */
    deleteMedicamento = (id) => {
        try {
            // Primeiro remover registros de histórico relacionados
            this.db.runSync('DELETE FROM historico WHERE medicamento_id = ?', [id]);

            // Depois remover o medicamento
            this.db.runSync('DELETE FROM medicamentos WHERE id = ?', [id]);

            return true;
        } catch (error) {
            console.error('Erro ao remover medicamento:', error);
            throw error;
        }
    };

    /**
     * Obtém todos os medicamentos de um usuário
     * @param {number} usuarioId - ID do usuário
     * @returns {Array} - Array de objetos de medicamentos
     */
    getMedicamentosByUsuario = (usuarioId) => {
        try {
            console.log("Buscando medicamentos para usuário:", usuarioId);
            const result = this.db.getAllSync(
                'SELECT * FROM medicamentos WHERE usuario_id = ? ORDER BY proxima_dose ASC',
                [usuarioId]
            );

            // Verificar se o campo total_doses está sendo retornado corretamente
            if (result && result.length > 0) {
                console.log("Primeiro medicamento encontrado:", JSON.stringify(result[0]));
            }

            return result;
        } catch (error) {
            console.error('Erro ao buscar medicamentos:', error);
            throw error;
        }
    };

    /**
     * Obtém um medicamento pelo ID
     * @param {number} id - ID do medicamento
     * @returns {object|null} - Objeto do medicamento ou null se não encontrado
     */
    getMedicamentoById = (id) => {
        try {
            return this.db.getFirstSync('SELECT * FROM medicamentos WHERE id = ?', [id]);
        } catch (error) {
            console.error('Erro ao buscar medicamento por ID:', error);
            throw error;
        }
    };

    // ========== OPERAÇÕES DE HISTÓRICO ==========

    /**
     * Adiciona um registro ao histórico quando um medicamento é tomado
     * @param {number} medicamentoId - ID do medicamento
     * @param {string} tomadoEm - Data e hora em que o medicamento foi tomado
     * @returns {object} - Objeto com o ID do registro inserido
     */
    addHistorico = (medicamentoId, tomadoEm) => {
        try {
            this.db.runSync(
                'INSERT INTO historico (medicamento_id, tomado_em) VALUES (?, ?)',
                [medicamentoId, tomadoEm]
            );

            // Obter o ID do último registro inserido
            const result = this.db.getFirstSync('SELECT last_insert_rowid() as id');
            return { id: result.id };
        } catch (error) {
            console.error('Erro ao adicionar registro ao histórico:', error);
            throw error;
        }
    };

    /**
     * Obtém o histórico de medicamentos tomados por um usuário
     * @param {number} usuarioId - ID do usuário
     * @returns {Array} - Array de objetos de histórico
     */
    getHistoricoByUsuario = (usuarioId) => {
        try {
            return this.db.getAllSync(`
        SELECT h.id, h.tomado_em, m.nome, m.quantidade, m.intervalo_horas
        FROM historico h 
        JOIN medicamentos m ON h.medicamento_id = m.id 
        WHERE m.usuario_id = ?
        ORDER BY h.tomado_em DESC
      `, [usuarioId]);
        } catch (error) {
            console.error('Erro ao buscar histórico:', error);
            throw error;
        }
    };

    /**
     * Remove um registro do histórico
     * @param {number} id - ID do registro no histórico
     * @returns {boolean} - true se a remoção for bem-sucedida
     */
    deleteHistorico = (id) => {
        try {
            this.db.runSync('DELETE FROM historico WHERE id = ?', [id]);
            return true;
        } catch (error) {
            console.error('Erro ao remover registro do histórico:', error);
            throw error;
        }
    };

    // Função auxiliar para executar SQL personalizado com segurança
    executeQuery = (sql, params = []) => {
        try {
            return this.db.getAllSync(sql, params);
        } catch (error) {
            console.error(`Erro ao executar query: ${sql}`, error);
            throw error;
        }
    };

    /**
     * Método getAllSync para ser chamado diretamente no objeto database
     * Este método serve como ponte para this.db.getAllSync
     */
    getAllSync = (sql, params = []) => {
        if (!this.db) {
            console.error('Banco de dados não inicializado. Chamando initDatabase...');
            this.initDatabase();
        }

        try {
            return this.db.getAllSync(sql, params);
        } catch (error) {
            console.error(`Erro ao executar getAllSync: ${sql}`, error);
            throw error;
        }
    };
}

// Exporta uma instância única da classe Database
const database = new Database();
export default database;
