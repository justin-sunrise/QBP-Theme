document.addEventListener("DOMContentLoaded", function () {
    document.querySelector(".mobile-filters .filters-title").addEventListener("click", function () {
      const div = document.querySelector('.mobile-filters-container');
      div.classList.remove('hidden');
      div.classList.add('visible');

    });

    document.querySelector(".mobile-filters-container .close-filters").addEventListener("click", function () {
      const div = document.querySelector('.mobile-filters-container');
      div.classList.remove('visible');
      div.classList.add('hidden');
      
    });

    document.querySelectorAll(".checkbox-label").forEach(label => { 
      label.addEventListener("click", function () {
        const input = document.getElementById(this.htmlFor);
        
        let href = window.location.href;

        if (input) {
          let tag = "";
          if(input.id.includes("desktop")) {
            tag = input.id.replace("desktop-", "");
          } else {
            tag = input.id.replace("mobile-", "");
          }
          if(tag == "all-articles") {
            href = document.location.href.split('/tagged/')[0];
          } else {
            if(input.checked) {
              if(window.location.href.includes(`${tag}+`)) {
                href = window.location.href.replace(`${tag}+`,'');
              }
              if(window.location.href.includes(`+${tag}`)) {
                href = window.location.href.replace(`+${tag}`,'');
              }
            } else {
              if(window.location.href.includes("tagged")) {
                const text = window.location.href.substring(window.location.href.indexOf('/tagged'));
                console.log(text)
                if (!text.includes(tag)) {
                  href = window.location.href+`+${tag}`;
                } 
              } else {
                href = window.location.href+`/tagged/${tag}`;
              }
            }
          }
        }
        console.log(input, href);

        window.location.href = href

      });
    });

    const url = window.location.href;
    const taggedMatch = url.match(/\/tagged\/([^\/]+)/);
    let selectedTag = "all-articles";
    if (taggedMatch) {
      selectedTag = decodeURIComponent(taggedMatch[1]);
    }
    
    if(selectedTag == "all-articles") {
      document.querySelectorAll(`#desktop-all-articles`).forEach(checkbox => {
        checkbox.checked = true;
      });
      document.querySelectorAll(`#mobile-all-articles`).forEach(checkbox => {
        checkbox.checked = true;
      });
    } else {
      const articleTags = selectedTag.split('+');
      
      articleTags.forEach((tag) => {
        document.querySelectorAll(`#desktop-${tag}`).forEach(checkbox => {
          checkbox.checked = true;
        });
        document.querySelectorAll(`#mobile-${tag}`).forEach(checkbox => {
          checkbox.checked = true;
        });
      })
    }

    
  });