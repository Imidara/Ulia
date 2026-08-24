 poems.forEach(poem => {
        const article = document.createElement("article");

        article.innerHTML = `
            <h3>${poem.title}</h3>
            <p>${poem.text}</p>
        `;

        container.appendChild(article);
    });
});