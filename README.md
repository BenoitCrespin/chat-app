# Application de Chat

Une application de chat en temps réel construite avec Node.js, Express, et Socket.IO.

---

## Fonctionnalités

- Inscription et connexion des utilisateurs
- Chat en temps réel
- Validation des comptes par email
- Interface utilisateur simple et intuitive

---

## Stack technique

- **Node.js / Express** – Serveur HTTP
- **Prisma** – ORM (SQLite en local, PostgreSQL en prod)
- **Socket.io** – Chat en temps réel
- **Twig** – Moteur de templates
- **bcrypt** – Hashage des mots de passe
- **nodemailer + Mailtrap** – Envoi des e-mails de validation
- **ES Modules** – Syntaxe moderne via `"type": "module"`

---

## Installation

### 1. Clonez le dépôt sur votre machine locale :

```bash
git clone <URL_DU_DEPOT>
```

### 2. Accédez au répertoire du projet :

```bash
cd nom-du-projet
```

### 3. Installez les dépendances nécessaires :

```bash
npm install
```

### 4. Créez un fichier .env à la racine du projet et configurez les variables d'environnement nécessaires. Voici un exemple de fichier .env :

```bash
DATABASE_URL="votre_url_de_base_de_données"
MAILTRAP_USER="votre_utilisateur_mailtrap"
MAILTRAP_PASS="votre_mot_de_passe_mailtrap"
```

### 5. Exécutez les migrations de la base de données avec Prisma :

```bash
npx prisma migrate dev
```

### 6. Utilisation

Pour démarrer l'application, utilisez la commande suivante :

```bash
npm start
```

L'application sera accessible à l'adresse suivante : http://localhost:3000.

