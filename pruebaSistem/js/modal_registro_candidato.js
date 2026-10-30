document.addEventListener("DOMContentLoaded", function () {
  const modalRegistro = document.getElementById("modal-registro-candidato");
  const btnAbrir = document.getElementById("btn-abrir-modal-registro");
  const btnCerrar = document.getElementById("btn-cerrar-modal");
  const btnCancelar = document.getElementById("btn-cancelar-modal");
  const formRegistro = document.getElementById("form-registrar-candidato");

  // Validaciones de seguridad para detectar si falta algún ID en el HTML
  if (!modalRegistro) console.warn("Advertencia: No se encontró el elemento #modal-registro-candidato");
  if (!btnAbrir) console.warn("Advertencia: No se encontró el botón #btn-abrir-modal-registro");

  // Abrir modal
  if (btnAbrir && modalRegistro) {
    btnAbrir.addEventListener("click", function () {
      modalRegistro.style.display = "flex";
    });
  }

  // Cerrar modal (con la X o Cancelar)
  function cerrarModal() {
    if (modalRegistro) modalRegistro.style.display = "none";
    if (formRegistro) formRegistro.reset();
  }

  if (btnCerrar) btnCerrar.addEventListener("click", cerrarModal);
  if (btnCancelar) btnCancelar.addEventListener("click", cerrarModal);

  // Cerrar haciendo clic fuera del contenido del modal
  window.addEventListener("click", function (event) {
    if (modalRegistro && event.target === modalRegistro) {
      cerrarModal();
    }
  });

  // Capturar el envío del formulario
  if (formRegistro) {
    formRegistro.addEventListener("submit", function (e) {
      e.preventDefault();

      const nuevoCandidato = {
        nombre: document.getElementById("reg-nombre").value,
        apellido: document.getElementById("reg-apellido").value,
        correo: document.getElementById("reg-correo").value,
        telefono: document.getElementById("reg-telefono").value,
        password: document.getElementById("reg-password").value
      };

      console.log("Datos listos para enviar al futuro endpoint:", nuevoCandidato);
      alert("¡Formulario validado con éxito! (Aquí conectaremos el backend en el siguiente paso)");

      cerrarModal();
    });
  }
});