SALVADOR LA VALLE

CoderHouse - Comisión #62020

Página de simulación de peleas de Digimons. 

Tiene un botón que hace uso del sessionStorage para cambiar el sistema de clasificación, además de hacer uso de las bibliotecas SweetAlert2 y Animate.css.

No se porqué (imagino que depende de la API) a veces los digimons se cargan rapido y otras veces puede tardar muchisimo, es bastante aleatorio.

La página está en español y en inglés: al abrirla elige sola el idioma del navegador (si no es ninguno de los dos, inglés) y el botón ES | EN de la barra permite cambiarlo en cualquier momento (la elección queda guardada con localStorage). Todos los textos están en i18n.js.

Línea evolutiva: en el dorso de cada carta hay un botón "🧬 Evolución" que abre un árbol con de qué digimon viene y a cuáles evoluciona (con sus imágenes y flechas). Solo aparecen los digimons que están en el simulador; al tocar uno, el árbol se centra en él, y "📍 Ir a la carta" te lleva a esa carta en la lista (queda centrada en la pantalla y titila con un pequeño zoom). Todo el código está en evolucion.js y sus estilos en design/styles.scss.

En celular: la barra de arriba es una franja finita (logo, contador, botón de combate y un menú ☰ con lo demás), las cartas van de a dos por fila, se inclinan manteniendo apretada la carta y moviendo el dedo, los botones vibran al tocarlos (en Android) y, una vez cargadas, solo se dibujan las cartas que están a la vista.
