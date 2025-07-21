#!/bin/bash

set -e  # Arrêter en cas d'erreur

echo "🚀 Début du déploiement..."
BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo "📦 Commit des modifications sur $BRANCH..."
git add .
git commit -m "$BRANCH"
git push origin "$BRANCH"

echo "🔄 Passage sur master et mise à jour..."
git checkout master
git pull origin master

echo "🔀 Fusion de $BRANCH dans master..."
git merge "$BRANCH"
git push origin master

echo "↩️ Retour sur $BRANCH..."
git checkout "$BRANCH"

echo "✅ Déploiement terminé avec succès depuis $BRANCH !"
