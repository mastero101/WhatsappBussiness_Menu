# WhatsApp Business API Chat Bot 🤖

Bot de WhatsApp para una agencia de viajes que permite a los usuarios explorar destinos, ver opciones de transporte, consultar precios y contactar con agentes de ventas.

## 🚀 Características

- Menú interactivo con múltiples opciones
- Exploración de destinos turísticos (Cancún, CDMX, Los Cabos, Puerto Vallarta)
- Información detallada sobre hoteles y tours
- Sistema de cotizaciones personalizado
- Atención personalizada con agentes
- Integración completa con WhatsApp Business API

## 🛠️ Tecnologías Utilizadas

- Node.js
- Express.js
- Axios para peticiones HTTP
- Ngrok para túnel seguro
- WhatsApp Cloud API
- dotenv para variables de entorno

## 📋 Requisitos Previos

- Node.js (v14 o superior)
- Cuenta de WhatsApp Business
- Cuenta de desarrollador de Meta
- Token de WhatsApp Business API
- Ngrok instalado globalmente

## ⚙️ Configuración

1. Clona el repositorio: 

2. Instala las dependencias:

npm install

3. Crea un archivo `.env` con las siguientes variables:

WHATSAPP_TOKEN=tu_token_de_whatsapp
WHATSAPP_PHONE_ID=tu_id_de_telefono
VERIFICATION_TOKEN=tu_token_de_verificacion
PORT=3000

## 🚀 Uso

1. Inicia el servidor:

npm start

2. El servidor iniciará en `http://localhost:3000` y Ngrok creará un túnel público

3. Configura el webhook en la consola de desarrolladores de Meta usando la URL de Ngrok

## 📱 Comandos Disponibles

- `menu`: Muestra el menú principal
- Opciones interactivas para:
  - Destinos turísticos
  - Reserva de transporte
  - Precios y paquetes
  - Atención personalizada

## 🌐 Endpoints

- `GET /webhook`: Verificación del webhook de WhatsApp
- `POST /webhook`: Recepción de mensajes de WhatsApp
- `GET /send-test/:phoneNumber`: Envía un mensaje de prueba
- `POST /test-webhook`: Endpoint de prueba

## 🤝 Contribuir

1. Haz un Fork del proyecto
2. Crea una rama para tu función (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE.md](LICENSE.md) para más detalles

## ✨ Agradecimientos

- WhatsApp Business API
- Meta Developers
- Ngrok

## 👥 Autores

- Mastero - github.com/mastero101

## 📞 Soporte

Para soporte, email castro.alejandro17@gmail.com o abre un issue en el repositorio.