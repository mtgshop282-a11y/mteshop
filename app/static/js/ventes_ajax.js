// static/js/ventes_ajax.js - Version optimisée
class PanierManager {
    constructor() {
        this.panier = [];
        this.total = 0;
        this.sessionId = this.getSessionId();
        this.searchTimeout = null;
        this.cachedProduits = [];
        this.currentProductQuery = '';
        this.currentProductPage = 1;
        this.hasMoreProducts = false;
        this.isLoadingProducts = false;
        this.init();
    }
    
    init() {
        this.chargerPanier();
        this.setupEventListeners();
        this.setupModal();
        this.setupRealTimeValidation();
        // Précharger les produits en arrière-plan
        setTimeout(() => this.prechargerProduits(), 1000);
    }
    
    getSessionId() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'session_id') {
                return value;
            }
        }
        return null;
    }
    
    async prechargerProduits() {
        try {
            await this.rechercherProduits('', 1, false);
        } catch (e) {
            console.warn('Préchargement échoué:', e);
        }
    }
    
    async chargerPanier() {
        try {
            console.log('Chargement du panier...');
            const response = await fetch('/api/panier/contenu');
            const data = await response.json();
            
            if (data.success) {
                this.panier = data.panier || [];
                this.total = data.total || 0;
                console.log('Panier chargé:', this.panier.length, 'articles');
                this.mettreAJourInterface();
            }
        } catch (error) {
            console.error('Erreur lors du chargement du panier:', error);
            this.afficherNotification('Erreur de chargement du panier', 'error');
        }
    }
    
    async ajouterProduit(produitId, quantite, prix) {
        try {
            const btn = document.getElementById('btn-ajouter-panier');
            const originalText = btn.innerHTML;
            
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Ajout en cours...';
            
            console.log('Ajout produit:', { produitId, quantite, prix });
            
            const response = await fetch('/api/panier/ajouter', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({ 
                    produit_id: produitId, 
                    quantite: quantite, 
                    prix: prix 
                })
            });
            
            const data = await response.json();
            console.log('Réponse ajout produit:', data);
            
            if (data.success) {
                this.panier = data.panier || [];
                this.total = data.total || 0;
                this.mettreAJourInterface();
                this.afficherNotification('Produit ajouté au panier', 'success');
                this.resetFormulaireProduit();
            } else {
                this.afficherNotification(data.message || 'Erreur lors de l\'ajout', 'error');
            }
            
            btn.disabled = false;
            btn.innerHTML = originalText;
            
        } catch (error) {
            console.error('Erreur lors de l\'ajout au panier:', error);
            this.afficherNotification('Erreur lors de l\'ajout au panier', 'error');
            
            const btn = document.getElementById('btn-ajouter-panier');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-cart-plus me-2"></i> Ajouter au panier';
        }
    }
    
    async supprimerProduit(itemId) {
        try {
            console.log('Suppression produit ID:', itemId);
            
            const response = await fetch(`/api/panier/supprimer/${itemId}`, { 
                method: 'DELETE',
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            const data = await response.json();
            
            if (data.success) {
                this.panier = this.panier.filter(item => item.id !== itemId);
                this.total = this.panier.reduce((sum, item) => sum + (item.total || 0), 0);
                
                this.mettreAJourInterface();
                this.afficherNotification('Produit supprimé du panier', 'success');
            } else {
                this.afficherNotification(data.message || 'Erreur lors de la suppression', 'error');
            }
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            this.afficherNotification('Erreur lors de la suppression', 'error');
        }
    }
    
    async viderPanier() {
        if (!confirm('Êtes-vous sûr de vouloir vider tout le panier ? Cette action est irréversible.')) {
            return;
        }
        
        try {
            const response = await fetch('/api/panier/vider', { 
                method: 'DELETE',
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            const data = await response.json();
            
            if (data.success) {
                this.panier = [];
                this.total = 0;
                this.mettreAJourInterface();
                this.afficherNotification('Panier vidé avec succès', 'success');
            } else {
                this.afficherNotification(data.message || 'Erreur lors du vidage', 'error');
            }
        } catch (error) {
            console.error('Erreur lors du vidage du panier:', error);
            this.afficherNotification('Erreur lors du vidage du panier', 'error');
        }
    }
    
    async finaliserVente(formData) {
        try {
            const btn = document.getElementById('btn-finaliser');
            const originalText = btn.innerHTML;
            
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Traitement en cours...';
            
            console.log('Finalisation vente:', formData);
            
            const response = await fetch('/api/ventes/finaliser', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            console.log('Réponse finalisation:', data);
            
            if (data.success) {
                this.panier = [];
                this.total = 0;
                this.mettreAJourInterface();
                this.afficherFacture(data);
                this.afficherNotification(data.message, 'success');
            } else {
                this.afficherNotification(data.message || 'Erreur lors de la finalisation', 'error');
            }
            
            btn.disabled = false;
            btn.innerHTML = originalText;
            
        } catch (error) {
            console.error('Erreur lors de la finalisation:', error);
            this.afficherNotification('Erreur lors de la finalisation de la vente', 'error');
            
            const btn = document.getElementById('btn-finaliser');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check-circle me-2"></i> Finaliser la vente';
        }
    }
    
    mettreAJourInterface() {
        console.log('Mise à jour interface, panier:', this.panier.length);
        
        const panierCount = document.getElementById('panier-count');
        const panierTotal = document.getElementById('panier-total');
        const totalPanier = document.getElementById('total-panier');
        
        if (panierCount) panierCount.textContent = this.panier.length;
        if (panierTotal) panierTotal.textContent = this.total.toFixed(2);
        if (totalPanier) totalPanier.textContent = this.total.toFixed(2);
        
        this.afficherPanier();
        
        const finalisationSection = document.getElementById('finalisation-section');
        if (finalisationSection) {
            if (this.panier.length > 0) {
                finalisationSection.style.display = 'block';
                const montantCash = document.getElementById('montant_cash');
                if (montantCash) montantCash.value = this.total.toFixed(2);
                this.calculerCredit();
            } else {
                finalisationSection.style.display = 'none';
            }
        }
    }
    
    afficherPanier() {
        const container = document.getElementById('panier-container');
        if (!container) {
            console.error('Container panier non trouvé');
            return;
        }
        
        if (this.panier.length === 0) {
            container.innerHTML = `
                <div class="d-flex flex-column align-items-center justify-content-center text-center py-5">
                    <i class="fas fa-shopping-basket fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">Votre panier est vide</h5>
                    <p class="text-muted mb-4">Ajoutez des produits pour commencer une vente</p>
                    <button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#produitModal">
                        <i class="fas fa-plus me-1"></i> Ajouter un produit
                    </button>
                </div>
            `;
            return;
        }
        
        let html = `
            <div class="table-responsive flex-grow-1">
                <table class="table table-bordered table-hover align-middle">
                    <thead class="table-dark">
                        <tr>
                            <th style="text-align: center;">Produit</th>
                            <th style="text-align: center;">Qté</th>
                            <th style="text-align: center;">Prix U.</th>
                            <th style="text-align: center;">Total</th>
                            <th style="text-align: center;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        this.panier.forEach(item => {
            html += `
                <tr>
                    <td style="text-align: center;">${item.produit_nom || 'Produit'}</td>
                    <td style="text-align: center;"><strong>${item.quantite || 0}</strong></td>
                    <td style="text-align: center;">${item.prix ? parseFloat(item.prix).toFixed(2) : '0.00'} $</td>
                    <td style="text-align: center; font-weight: 600;">${item.total ? parseFloat(item.total).toFixed(2) : '0.00'} $</td>
                    <td style="text-align: center;">
                        <button type="button" class="btn btn-sm btn-outline-danger" onclick="panierManager.supprimerProduit(${item.id})">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        container.innerHTML = html;
    }
    
    resetFormulaireProduit() {
        document.getElementById('produit-selectionne-card').style.display = 'none';
        document.getElementById('produit_id').value = '';
        document.getElementById('quantite').value = 1;
        document.getElementById('prix').value = '';
        document.getElementById('btn-ajouter-panier').disabled = true;
    }
    
    afficherFacture(data) {
        const facture = data.facture;
        const ventes = data.ventes || [];
        
        let html = `
            <div class="thermal-receipt mx-auto" id="facture-print" style="text-align: center;">
                <div class="receipt-header" style="margin-bottom: 10px;">
                    <h2 style="font-size: 16px; margin: 0; font-weight: 900;">PETIT KIOSQUE M.T.E</h2>
                    <p style="font-size: 11px; margin: 3px 0;">Galerie G.H.P Numero 80</p>
                    <p style="font-size: 11px; margin: 3px 0;">Chez : Esther</p>
                    <p style="font-size: 11px; margin: 3px 0;">Tel: +243 979262503</p>
                </div>
                
                <div style="font-size: 10px; margin: 8px 0;">================================</div>
                
                <div style="font-size: 11px; margin-bottom: 10px;">
                    <div><strong>FACTURE N°: ${facture.id || ''}</strong></div>
                    <div><strong>DATE: ${facture.date_facture ? facture.date_facture.split(' ')[0] : new Date().toLocaleDateString('fr-FR')}</strong></div>
                    <div><strong>HEURE: ${facture.date_facture ? facture.date_facture.split(' ')[1] : new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</strong></div>
                    <div><strong>CLIENT: ${facture.nom_client || ''}</strong></div>
        `;
        
        if (facture.type_livraison === 'depot') {
            html += `
                    <div><strong>LIVRAISON: AU DÉPÔT</strong></div>
                    <div><strong>LIEU RETRAIT: ${(facture.lieu_retrait || '').toUpperCase()}</strong></div>
            `;
        }
        
        html += `
                </div>
                
                <div style="font-size: 10px; margin: 8px 0;">--------------------------------</div>
                
                <div>
                    <table style="width: 100%; border-collapse: collapse; margin: 0 auto 10px;">
                        <thead>
                            <tr>
                                <th style="border: 1px solid #000; padding: 6px; font-size: 11px;">DESCRIPTION</th>
                                <th style="border: 1px solid #000; padding: 6px; font-size: 11px;">QTE</th>
                                <th style="border: 1px solid #000; padding: 6px; font-size: 11px;">PRIX</th>
                                <th style="border: 1px solid #000; padding: 6px; font-size: 11px;">TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        ventes.forEach(vente => {
            html += `
                <tr>
                    <td style="border: 1px solid #000; padding: 5px; font-size: 11px;">${vente.produit_nom || ''}</td>
                    <td style="border: 1px solid #000; padding: 5px; font-size: 11px;">${vente.quantite || 0}</td>
                    <td style="border: 1px solid #000; padding: 5px; font-size: 11px;">${parseFloat(vente.prix_unitaire || 0).toFixed(2)}$</td>
                    <td style="border: 1px solid #000; padding: 5px; font-size: 11px;">${parseFloat(vente.montant_total || 0).toFixed(2)}$</td>
                </tr>
            `;
        });
        
        html += `
                        </tbody>
                    </table>
                </div>
                
                <div style="font-size: 10px; margin: 8px 0;">--------------------------------</div>
                
                <div style="font-size: 12px; margin: 10px 0;">
                    <div style="display: inline-block; background-color: #e9ecef; padding: 8px 15px; border: 1px solid #000;">
                        <strong>TOTAL GÉNÉRAL: ${parseFloat(facture.montant_total || 0).toFixed(2)}$</strong>
                    </div>
                </div>
        `;
        
        if (facture.paiement_credit) {
            html += `
                <div style="font-size: 10px; margin: 8px 0;">--------------------------------</div>
                
                <div style="font-size: 11px; margin: 10px 0;">
                    <div><strong>MODE DE PAIEMENT: <span style="color: #dc3545;">CRÉDIT</span></strong></div>
                    <div><strong>MONTANT PAYÉ: ${parseFloat(facture.montant_cash || 0).toFixed(2)}$</strong></div>
                    <div><strong>RESTE À PAYER: <span style="color: #dc3545;">${parseFloat(facture.montant_credit || 0).toFixed(2)}$</span></strong></div>
                </div>
            `;
        } else {
            html += `
                <div style="font-size: 11px; margin: 10px 0;">
                    <div><strong>MODE DE PAIEMENT: <span style="color: #28a745;">COMPTANT</span></strong></div>
                </div>
            `;
        }
        
        html += `
                <div style="font-size: 10px; margin: 8px 0;">================================</div>
                
                <div>
                    <p style="margin: 6px 0; font-size: 11px;">Merci pour votre confiance !</p>
                    <p style="margin: 6px 0; font-size: 10px;">Les Marchandises vendues ne sont ni remboursables ni échangables.</p>
        `;
        
        if (facture.type_livraison === 'depot') {
            html += `<p style="margin: 6px 0; font-size: 10px;">Votre commande sera disponible au dépôt ${facture.lieu_retrait || ''}</p>`;
        } else {
            html += `<p style="margin: 6px 0; font-size: 10px;">À bientôt chez PETIT KIOSQUE M.T.E</p>`;
        }
        
        html += `
                    <p style="margin: 6px 0; font-size: 9px;">Imprimé le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
            </div>
            
            <style>
                .thermal-receipt { width: 80mm; max-width: 80mm; padding: 5px; font-weight: bold !important; }
                #facture-print { font-weight: bold !important; }
                #facture-print * { text-align: center; font-weight: bold !important; }
                @media print {
                    @page { size: 80mm auto; margin: 0; }
                    body * { visibility: hidden; }
                    #facture-print, #facture-print * { visibility: visible; }
                    #facture-print { position: absolute; left: 0; top: 0; width: 80mm; }
                }
            </style>
        `;
        
        document.getElementById('facture-content').innerHTML = html;
        const factureModal = new bootstrap.Modal(document.getElementById('factureModal'));
        factureModal.show();
    }
    
    setupEventListeners() {
        console.log('Initialisation des écouteurs');
        
        const btnAjouter = document.getElementById('btn-ajouter-panier');
        if (btnAjouter) {
            btnAjouter.addEventListener('click', (e) => {
                e.preventDefault();
                const produitId = document.getElementById('produit_id').value;
                const quantite = parseInt(document.getElementById('quantite').value) || 1;
                const prix = parseFloat(document.getElementById('prix').value) || 0;
                
                if (!produitId || quantite <= 0 || prix <= 0) {
                    this.afficherNotification('Veuillez sélectionner un produit', 'warning');
                    return;
                }
                
                this.ajouterProduit(produitId, quantite, prix);
            });
        }
        
        const btnVider = document.getElementById('btn-vider-panier');
        if (btnVider) {
            btnVider.addEventListener('click', (e) => {
                e.preventDefault();
                this.viderPanier();
            });
        }
        
        const finaliserForm = document.getElementById('finaliserForm');
        if (finaliserForm) {
            finaliserForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFinaliserVente();
            });
        }
        
        const decrementBtn = document.getElementById('decrement-qte');
        if (decrementBtn) {
            decrementBtn.addEventListener('click', () => {
                const input = document.getElementById('quantite');
                let value = parseInt(input.value) || 1;
                if (value > 1) input.value = value - 1;
            });
        }
        
        const incrementBtn = document.getElementById('increment-qte');
        if (incrementBtn) {
            incrementBtn.addEventListener('click', () => {
                const input = document.getElementById('quantite');
                let value = parseInt(input.value) || 1;
                input.value = value + 1;
            });
        }
        
        const paiementCredit = document.getElementById('paiement_credit');
        if (paiementCredit) {
            paiementCredit.addEventListener('change', () => {
                document.getElementById('montant_cash_group').style.display = 'block';
                this.calculerCredit();
            });
        }
        
        const paiementComptant = document.getElementById('paiement_comptant');
        if (paiementComptant) {
            paiementComptant.addEventListener('change', () => {
                document.getElementById('montant_cash_group').style.display = 'none';
                const creditElement = document.getElementById('credit-amount');
                if (creditElement) creditElement.style.display = 'none';
            });
        }
        
        const montantCash = document.getElementById('montant_cash');
        if (montantCash) {
            montantCash.addEventListener('input', () => this.calculerCredit());
        }
        
        const livraisonDepot = document.getElementById('livraison_depot');
        if (livraisonDepot) {
            livraisonDepot.addEventListener('change', () => {
                document.getElementById('lieu_retrait_group').style.display = 'block';
                document.getElementById('depot-warning').style.display = 'block';
            });
        }
        
        const livraisonSurPlace = document.getElementById('livraison_sur_place');
        if (livraisonSurPlace) {
            livraisonSurPlace.addEventListener('change', () => {
                document.getElementById('lieu_retrait_group').style.display = 'none';
                document.getElementById('depot-warning').style.display = 'none';
            });
        }
    }
    
    setupModal() {
        console.log('Initialisation de la modale');
        
        const searchInput = document.getElementById('searchProduitModal');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.rechercherProduits(e.target.value, 1, false);
                }, 300);
            });
        }
        
        const btnRecherche = document.getElementById('btn-recherche');
        if (btnRecherche) {
            btnRecherche.addEventListener('click', () => {
                const searchInput = document.getElementById('searchProduitModal');
                if (searchInput) {
                    this.rechercherProduits(searchInput.value, 1, false);
                }
            });
        }
        
        const produitModal = document.getElementById('produitModal');
        if (produitModal) {
            produitModal.addEventListener('show.bs.modal', () => {
                // Afficher immédiatement le cache si disponible
                if (this.cachedProduits && this.cachedProduits.length > 0) {
                    console.log('Affichage depuis le cache:', this.cachedProduits.length, 'produits');
                    this.afficherProduits(this.cachedProduits);
                } else {
                    console.log('Cache vide, chargement...');
                    this.afficherChargementProduits();
                    this.rechercherProduits('', 1, false);
                }
            });
        }
    }
    
    setupRealTimeValidation() {
        const nomClient = document.getElementById('nom_client');
        if (nomClient) {
            nomClient.addEventListener('input', () => this.validerFormulaire());
        }
        
        const montantCash = document.getElementById('montant_cash');
        if (montantCash) {
            montantCash.addEventListener('input', () => this.validerFormulaire());
        }
    }
    
    async rechercherProduits(query, page = 1, append = false) {
        if (this.isLoadingProducts) return;
        
        try {
            this.isLoadingProducts = true;
            console.log('Recherche produits:', { query, page, append });
            this.currentProductQuery = query;
            this.currentProductPage = page;
            
            if (!append) {
                this.afficherChargementProduits();
            }

            const response = await fetch(`/api/produits/search?q=${encodeURIComponent(query)}&page=${page}&limit=50`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            
            if (data.success) {
                console.log('Produits trouvés:', data.produits.length);
                this.hasMoreProducts = Boolean(data.has_more);
                
                if (append && this.cachedProduits) {
                    this.cachedProduits = [...this.cachedProduits, ...(data.produits || [])];
                } else {
                    this.cachedProduits = data.produits || [];
                }
                
                this.afficherProduits(this.cachedProduits);
            } else {
                this.afficherProduits([]);
                this.afficherNotification(data.message || 'Erreur lors de la recherche', 'error');
            }
        } catch (error) {
            console.error('Erreur lors de la recherche:', error);
            this.afficherProduits([]);
            this.afficherNotification('Erreur lors de la recherche des produits', 'error');
        } finally {
            this.isLoadingProducts = false;
        }
    }

    async chargerPageProduits() {
        if (!this.hasMoreProducts || this.isLoadingProducts) return;
        this.currentProductPage += 1;
        await this.rechercherProduits(this.currentProductQuery, this.currentProductPage, true);
    }

    afficherChargementProduits() {
        const container = document.getElementById('produitListModal');
        if (!container) return;
        
        container.innerHTML = `
            <div class="text-center py-4" id="loading-produits">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Chargement...</span>
                </div>
                <p class="mt-2 text-muted">Chargement des produits...</p>
            </div>
        `;
    }
    
    afficherProduits(produits) {
        const container = document.getElementById('produitListModal');
        if (!container) {
            console.error('Container produits non trouvé');
            return;
        }
        
        if (!produits || produits.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-box-open fa-3x text-muted mb-3"></i>
                    <p class="text-muted">Aucun produit trouvé</p>
                    <p class="text-muted small">Essayez une autre recherche</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        produits.forEach(produit => {
            const hasStock = produit.quantite > 0;
            const hasDepotStock = produit.quantite_depot > 0;
            
            html += `
                <div class="list-group-item list-group-item-action produit-item" 
                     onclick="panierManager.selectionnerProduit(this)"
                     data-id="${produit.id}" 
                     data-prix="${produit.prix}" 
                     data-nom="${this.escapeHtml(produit.nom)}" 
                     data-stock="${produit.quantite}"
                     data-stock-depot="${produit.quantite_depot || 0}"
                     style="cursor: pointer;">
                    <div class="d-flex w-100 justify-content-between align-items-center">
                        <div class="flex-grow-1">
                            <h6 class="mb-1 fw-semibold">${this.escapeHtml(produit.nom)}</h6>
                            <div class="d-flex flex-wrap gap-2">
                                <small class="text-muted">📦 Stock: ${produit.quantite}</small>
                                ${hasDepotStock ? `<small class="text-info">🏪 Dépôt: ${produit.quantite_depot}</small>` : ''}
                            </div>
                        </div>
                        <div class="text-end">
                            <div class="fw-bold text-primary fs-5">${parseFloat(produit.prix || 0).toFixed(2)} $</div>
                            <span class="badge ${hasStock ? 'bg-success' : 'bg-danger'} mt-1">
                                ${hasStock ? 'En stock' : 'Rupture'}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        if (this.hasMoreProducts) {
            html += `
                <div class="text-center py-3">
                    <button type="button" id="btn-load-more-produits" class="btn btn-outline-primary btn-sm">
                        <i class="fas fa-chevron-down me-1"></i> Voir plus de produits
                    </button>
                </div>
            `;
        }
        
        container.innerHTML = html;

        if (this.hasMoreProducts) {
            const loadMoreBtn = document.getElementById('btn-load-more-produits');
            if (loadMoreBtn) {
                loadMoreBtn.addEventListener('click', () => this.chargerPageProduits());
            }
        }

        console.log('Produits affichés:', produits.length);
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    selectionnerProduit(element) {
        const produitId = element.getAttribute('data-id');
        const produitPrix = element.getAttribute('data-prix');
        const produitNom = element.getAttribute('data-nom');
        const produitStock = element.getAttribute('data-stock');
        const produitStockDepot = element.getAttribute('data-stock-depot');
        
        document.getElementById('produit_id').value = produitId;
        document.getElementById('prix').value = produitPrix;
        
        document.getElementById('nom-produit-text').textContent = produitNom;
        document.getElementById('stock-produit-text').innerHTML = `📦 Stock magasin: ${produitStock} | 🏪 Dépôt: ${produitStockDepot || 0}`;
        document.getElementById('prix-produit-text').innerHTML = `${parseFloat(produitPrix).toFixed(2)} $`;
        document.getElementById('produit-selectionne-card').style.display = 'block';
        
        document.getElementById('btn-ajouter-panier').disabled = false;
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('produitModal'));
        if (modal) modal.hide();
    }
    
    calculerCredit() {
        const paiementCredit = document.getElementById('paiement_credit');
        if (!paiementCredit || !paiementCredit.checked) return;
        
        const total = this.total;
        const montantCash = parseFloat(document.getElementById('montant_cash').value) || 0;
        const credit = total - montantCash;
        
        const creditElement = document.getElementById('credit-amount');
        const montantCreditElement = document.getElementById('montant-credit');
        
        if (creditElement && montantCreditElement) {
            if (credit > 0) {
                creditElement.style.display = 'block';
                montantCreditElement.textContent = credit.toFixed(2);
            } else {
                creditElement.style.display = 'none';
            }
        }
    }
    
    validerFormulaire() {
        const nomClient = document.getElementById('nom_client')?.value.trim() || '';
        let isValid = !!nomClient;
        
        const btn = document.getElementById('btn-finaliser');
        if (btn) btn.disabled = !isValid;
        
        return isValid;
    }
    
    handleFinaliserVente() {
        if (!this.validerFormulaire()) {
            this.afficherNotification('Veuillez saisir le nom du client', 'warning');
            return;
        }
        
        if (this.panier.length === 0) {
            this.afficherNotification('Le panier est vide', 'warning');
            return;
        }
        
        const nomClient = document.getElementById('nom_client').value.trim();
        const paiementType = document.querySelector('input[name="paiement_type"]:checked')?.value || 'comptant';
        const montantCash = parseFloat(document.getElementById('montant_cash').value) || 0;
        const typeLivraison = document.querySelector('input[name="type_livraison"]:checked')?.value || 'sur_place';
        const lieuRetrait = document.getElementById('lieu_retrait')?.value || 'magasin';
        
        if (typeLivraison === 'depot') {
            if (!confirm('⚠️ Livraison au dépôt: Le stock ne sera déduit qu\'après confirmation par le responsable. Confirmer?')) {
                return;
            }
        }
        
        const formData = {
            nom_client: nomClient,
            paiement_type: paiementType,
            montant_cash: montantCash,
            type_livraison: typeLivraison,
            lieu_retrait: lieuRetrait
        };
        
        this.finaliserVente(formData);
    }
    
    afficherNotification(message, type = 'info') {
        // Utiliser Toastr si disponible, sinon alert
        if (typeof toastr !== 'undefined') {
            toastr[type](message);
        } else if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else {
            alert(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM chargé, initialisation PanierManager');
    window.panierManager = new PanierManager();
});

function imprimerFacture() {
    const printContent = document.getElementById('facture-print');
    if (!printContent) {
        alert('Aucune facture à imprimer');
        return;
    }
    
    const printWindow = window.open('', '_blank', 'width=500,height=600');
    if (!printWindow) {
        alert('Impossible d’ouvrir la fenêtre d’impression. Désactivez le bloqueur de fenêtres surgissantes pour continuer.');
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Facture</title>
            <meta charset="UTF-8">
            <style>
                * { text-align: center; }
                body { font-family: Arial, sans-serif; margin: 0; padding: 10px; width: 80mm; }
                table { width: 100%; border-collapse: collapse; }
                td, th { border: 1px solid #000; padding: 5px; }
                @media print {
                    @page { size: 80mm auto; margin: 0; }
                    body { margin: 0; padding: 5px; }
                }
            </style>
        </head>
        <body>${printContent.outerHTML}</body>
        </html>
    `);
    printWindow.document.close();
    printWindow.onload = function() {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    };
}