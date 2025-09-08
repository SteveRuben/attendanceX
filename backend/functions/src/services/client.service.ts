import { 
  Client, 
  ClientPreferences,
  VALIDATION_RULES
} from "../shared";
import { ClientModel } from "../models/client.model";
import { getFirestore } from "firebase-admin/firestore";
import { 
  CollectionReference, 
  Query
} from "firebase-admin/firestore";

/**
 * Service de gestion des clients
 * 
 * Ce service gère toutes les opérations CRUD sur les clients,
 * la validation des données, la détection de doublons,
 * et la gestion des préférences.
 */
export class ClientService {
  private clientsCollection: CollectionReference;

  constructor() {
    const db = getFirestore();
    this.clientsCollection = db.collection('clients');
  }

  /**
   * Crée un nouveau client
   */
  async createClient(
    clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>,
    createdBy: string
  ): Promise<ClientModel> {
    // Vérification des doublons
    const existingClient = await this.findDuplicateClient(
      clientData.organizationId,
      clientData.email,
      clientData.phone
    );

    if (existingClient) {
      throw new Error(`Client already exists with ${existingClient.duplicateField}: ${existingClient.duplicateValue}`);
    }

    // Création du modèle client
    const clientModel = new ClientModel({
      ...clientData,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Validation
    await clientModel.validate();

    // Sauvegarde en base
    const docRef = await this.clientsCollection.add(clientModel.toFirestore());
    
    // Récupération du client créé
    const createdClient = await this.getClientById(docRef.id);
    if (!createdClient) {
      throw new Error('Failed to create client');
    }

    return createdClient;
  }

  /**
   * Met à jour un client existant
   */
  async updateClient(
    clientId: string,
    updates: Partial<Omit<Client, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>>,
    updatedBy: string
  ): Promise<ClientModel> {
    const existingClient = await this.getClientById(clientId);
    if (!existingClient) {
      throw new Error('Client not found');
    }

    // Vérification des doublons si email ou téléphone sont modifiés
    if (updates.email || updates.phone) {
      const existingData = existingClient.getData();
      const duplicateClient = await this.findDuplicateClient(
        existingData.organizationId,
        updates.email || existingData.email,
        updates.phone || existingData.phone,
        clientId // Exclure le client actuel de la recherche
      );

      if (duplicateClient) {
        throw new Error(`Another client already exists with ${duplicateClient.duplicateField}: ${duplicateClient.duplicateValue}`);
      }
    }

    // Mise à jour du modèle
    const updatedData = {
      ...updates,
      updatedAt: new Date()
    };

    const updatedClient = new ClientModel({
      ...existingClient.getData(),
      ...updatedData
    });

    // Validation
    await updatedClient.validate();

    // Sauvegarde en base
    await this.clientsCollection.doc(clientId).update(updatedClient.toFirestore());

    // Récupération du client mis à jour
    const result = await this.getClientById(clientId);
    if (!result) {
      throw new Error('Failed to update client');
    }

    return result;
  }

  /**
   * Supprime un client
   */
  async deleteClient(clientId: string, deletedBy: string): Promise<void> {
    const client = await this.getClientById(clientId);
    if (!client) {
      throw new Error('Client not found');
    }

    // Vérification si le client peut être supprimé
    const canDelete = client.canBeDeleted();
    if (!canDelete.canDelete) {
      throw new Error(`Cannot delete client: ${canDelete.reasons.join(', ')}`);
    }

    // Suppression en base
    await this.clientsCollection.doc(clientId).delete();
  }

  /**
   * Récupère un client par son ID
   */
  async getClientById(clientId: string): Promise<ClientModel | null> {
    const doc = await this.clientsCollection.doc(clientId).get();
    return ClientModel.fromFirestore(doc);
  }

  /**
   * Récupère les clients d'une organisation avec filtres
   */
  async getClients(
    organizationId: string,
    filters: {
      searchQuery?: string;
      limit?: number;
      offset?: number;
      sortBy?: 'firstName' | 'lastName' | 'email' | 'createdAt';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{ clients: ClientModel[]; total: number }> {
    let query: Query = this.clientsCollection.where('organizationId', '==', organizationId);

    // Tri
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';
    query = query.orderBy(sortBy, sortOrder);

    // Pagination
    if (filters.offset) {
      query = query.offset(filters.offset);
    }
    
    const limit = Math.min(filters.limit || VALIDATION_RULES.PAGINATION.DEFAULT_LIMIT, VALIDATION_RULES.PAGINATION.MAX_LIMIT);
    query = query.limit(limit);

    const snapshot = await query.get();
    let clients = snapshot.docs
      .map(doc => ClientModel.fromFirestore(doc))
      .filter(client => client !== null) as ClientModel[];

    // Filtrage par recherche (côté client car Firestore ne supporte pas la recherche full-text)
    if (filters.searchQuery) {
      clients = clients.filter(client => client.matchesSearch(filters.searchQuery!));
    }

    // Comptage total (approximatif pour les performances)
    const totalQuery = this.clientsCollection.where('organizationId', '==', organizationId);
    const totalSnapshot = await totalQuery.count().get();
    const total = totalSnapshot.data().count;

    return { clients, total };
  }

  /**
   * Recherche de clients par email ou téléphone
   */
  async findClientByContact(
    organizationId: string,
    email?: string,
    phone?: string
  ): Promise<ClientModel | null> {
    if (!email && !phone) {
      return null;
    }

    let query: Query = this.clientsCollection.where('organizationId', '==', organizationId);

    if (email) {
      query = query.where('email', '==', email.toLowerCase().trim());
    } else if (phone) {
      query = query.where('phone', '==', phone.trim());
    }

    const snapshot = await query.limit(1).get();
    if (snapshot.empty) {
      return null;
    }

    return ClientModel.fromFirestore(snapshot.docs[0]);
  }

  /**
   * Met à jour les préférences d'un client
   */
  async updateClientPreferences(
    clientId: string,
    preferences: Partial<ClientPreferences>,
    updatedBy: string
  ): Promise<ClientModel> {
    const client = await this.getClientById(clientId);
    if (!client) {
      throw new Error('Client not found');
    }

    client.updatePreferences(preferences, updatedBy);
    await client.validate();

    await this.clientsCollection.doc(clientId).update(client.toFirestore());

    const result = await this.getClientById(clientId);
    if (!result) {
      throw new Error('Failed to update client preferences');
    }

    return result;
  }

  /**
   * Anonymise les données d'un client (RGPD)
   */
  async anonymizeClient(clientId: string, anonymizedBy: string): Promise<ClientModel> {
    const client = await this.getClientById(clientId);
    if (!client) {
      throw new Error('Client not found');
    }

    client.anonymize(anonymizedBy);
    await this.clientsCollection.doc(clientId).update(client.toFirestore());

    const result = await this.getClientById(clientId);
    if (!result) {
      throw new Error('Failed to anonymize client');
    }

    return result;
  }

  /**
   * Exporte les données d'un client (RGPD)
   */
  async exportClientData(clientId: string): Promise<any> {
    const client = await this.getClientById(clientId);
    if (!client) {
      throw new Error('Client not found');
    }

    return client.exportData();
  }

  /**
   * Recherche de doublons
   */
  private async findDuplicateClient(
    organizationId: string,
    email: string,
    phone: string,
    excludeClientId?: string
  ): Promise<{ duplicateField: string; duplicateValue: string } | null> {
    // Recherche par email
    const emailQuery = this.clientsCollection
      .where('organizationId', '==', organizationId)
      .where('email', '==', email.toLowerCase().trim())
      .limit(1);

    const emailSnapshot = await emailQuery.get();
    if (!emailSnapshot.empty) {
      const duplicateClient = emailSnapshot.docs[0];
      if (!excludeClientId || duplicateClient.id !== excludeClientId) {
        return { duplicateField: 'email', duplicateValue: email };
      }
    }

    // Recherche par téléphone
    const phoneQuery = this.clientsCollection
      .where('organizationId', '==', organizationId)
      .where('phone', '==', phone.trim())
      .limit(1);

    const phoneSnapshot = await phoneQuery.get();
    if (!phoneSnapshot.empty) {
      const duplicateClient = phoneSnapshot.docs[0];
      if (!excludeClientId || duplicateClient.id !== excludeClientId) {
        return { duplicateField: 'phone', duplicateValue: phone };
      }
    }

    return null;
  }

  /**
   * Valide les données d'un client
   */
  async validateClientData(clientData: Partial<Client>): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      const tempClient = new ClientModel(clientData as Client);
      await tempClient.validate();
      return { isValid: true, errors: [] };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Validation error');
      return { isValid: false, errors };
    }
  }

  /**
   * Obtient les statistiques des clients pour une organisation
   */
  async getClientStats(organizationId: string): Promise<{
    totalClients: number;
    newClientsThisMonth: number;
    clientsByLanguage: Record<string, number>;
    clientsByReminderMethod: Record<string, number>;
  }> {
    const query = this.clientsCollection.where('organizationId', '==', organizationId);
    const snapshot = await query.get();

    const clients = snapshot.docs
      .map(doc => ClientModel.fromFirestore(doc))
      .filter(client => client !== null) as ClientModel[];

    const totalClients = clients.length;

    // Nouveaux clients ce mois
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const newClientsThisMonth = clients.filter(client => {
      const clientData = client.getData();
      return clientData.createdAt >= thisMonth;
    }).length;

    // Répartition par langue
    const clientsByLanguage: Record<string, number> = {};
    clients.forEach(client => {
      const clientData = client.getData();
      const language = clientData.preferences.language;
      clientsByLanguage[language] = (clientsByLanguage[language] || 0) + 1;
    });

    // Répartition par méthode de rappel
    const clientsByReminderMethod: Record<string, number> = {};
    clients.forEach(client => {
      const clientData = client.getData();
      const method = clientData.preferences.reminderMethod;
      clientsByReminderMethod[method] = (clientsByReminderMethod[method] || 0) + 1;
    });

    return {
      totalClients,
      newClientsThisMonth,
      clientsByLanguage,
      clientsByReminderMethod
    };
  }

  /**
   * Importe des clients en lot
   */
  async importClients(
    organizationId: string,
    clientsData: Array<Omit<Client, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>>,
    importedBy: string
  ): Promise<{ 
    successful: ClientModel[]; 
    failed: Array<{ data: any; error: string }> 
  }> {
    const successful: ClientModel[] = [];
    const failed: Array<{ data: any; error: string }> = [];

    for (const clientData of clientsData) {
      try {
        const client = await this.createClient(
          { ...clientData, organizationId },
          importedBy
        );
        successful.push(client);
      } catch (error) {
        failed.push({
          data: clientData,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return { successful, failed };
  }
}