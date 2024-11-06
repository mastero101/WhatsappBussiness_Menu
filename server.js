const express = require('express');
const axios = require('axios');
const ngrok = require('ngrok');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const whatsappToken = process.env.WHATSAPP_TOKEN;
const whatsappPhoneId = process.env.WHATSAPP_PHONE_ID;
const verificationToken = process.env.VERIFICATION_TOKEN;

// Ruta de prueba para verificar el webhook
app.post('/test-webhook', (req, res) => {
  console.log('🔍 Test webhook recibido:', JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

// Webhook para recibir eventos de WhatsApp
app.post('/webhook', async (req, res) => {
  console.log('\n🔄 ================== NUEVO MENSAJE ==================');
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  
  const body = req.body;

  if (!body.object) {
    console.log('❌ No se encontró objeto en el body');
    return res.sendStatus(404);
  }

  if (body.object === 'whatsapp_business_account') {
    if (!body.entry || !body.entry.length) {
      console.log('❌ No hay entries en el webhook');
      return res.sendStatus(404);
    }

    try {
      for (const entry of body.entry) {
        if (!entry.changes || !entry.changes.length) {
          console.log('❌ No hay changes en el entry');
          continue;
        }

        for (const change of entry.changes) {
          console.log('📝 Procesando change:', JSON.stringify(change, null, 2));

          // Verificar si es una actualización de estado
          if (change.value.statuses) {
            console.log('📊 Actualización de estado recibida:', 
              change.value.statuses[0].status);
            continue;
          }

          // Verificar si hay mensajes
          if (!change.value.messages || !change.value.messages.length) {
            console.log('ℹ️ No hay mensajes en este change');
            continue;
          }

          const message = change.value.messages[0];
          console.log('📩 Mensaje recibido:', JSON.stringify(message, null, 2));

          // Manejar diferentes tipos de mensajes
          switch (message.type) {
            case 'interactive':
              console.log('🎯 Mensaje interactivo detectado');
              if (message.interactive.type === 'list_reply') {
                const selectedOption = message.interactive.list_reply.id;
                console.log('📋 Opción de lista seleccionada:', selectedOption);
                await handleUserResponse(selectedOption, message.from);
              }
              break;

            case 'text':
              console.log('✍️ Mensaje de texto recibido:', message.text.body);
              if (message.text.body.toLowerCase() === 'menu') {
                await sendInitialMenu(message.from);
              }
              break;

            default:
              console.log('❓ Tipo de mensaje no manejado:', message.type);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error procesando webhook:', error);
      return res.sendStatus(500);
    }

    res.sendStatus(200);
  } else {
    console.log('❌ Objeto no reconocido:', body.object);
    res.sendStatus(404);
  }
});

// Verificación del webhook (para la configuración inicial en Facebook)
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
  
    console.log('🔍 Verificación de webhook recibida:');
    console.log('Mode:', mode);
    console.log('Token:', token);
    console.log('Challenge:', challenge);
  
    if (mode && token === verificationToken) {
      console.log('✅ Verificación exitosa');
      res.status(200).send(challenge);
    } else {
      console.log('❌ Verificación fallida');
      res.sendStatus(403);
    }
});

// Función para formatear el número de teléfono
async function formatPhoneNumber(phoneNumber) {
  // Eliminar cualquier carácter que no sea número
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Si el número comienza con 521, convertirlo a 52
  if (cleaned.startsWith('521')) {
    cleaned = '52' + cleaned.substring(3);
    console.log('🔄 Convertido número con prefijo 521 a 52');
  }
  
  // Verificar que el número tenga el formato correcto (52 + 10 dígitos)
  if (!cleaned.match(/^52\d{10}$/)) {
    console.warn('⚠️ El número no cumple con el formato esperado');
  }
  
  console.log('📱 Número original:', phoneNumber);
  console.log('📱 Número formateado:', cleaned);
  
  return cleaned;
}

// Modificar la función de verificación
async function verifyPhoneNumber(phoneNumber) {
  try {
    const formattedNumber = await formatPhoneNumber(phoneNumber);
    console.log(`🔍 Verificando número formateado: ${formattedNumber}`);
    
    const response = await axios.post(
      `https://graph.facebook.com/v20.0/${whatsappPhoneId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: formattedNumber,
        type: 'text',
        text: {
          body: '🔍 Verificando conexión...'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${whatsappToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Número verificado:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    if (error.response?.data?.error?.code === 131030) {
      console.error(`
🚨 INSTRUCCIONES PARA AGREGAR NÚMERO:
1. Ve a https://developers.facebook.com/apps
2. Selecciona tu aplicación
3. Ve a "WhatsApp > Configuración"
4. En "Números de teléfono para pruebas"
5. Haz clic en "Agregar número de teléfono"
6. Ingresa: +${await formatPhoneNumber(phoneNumber)}
7. Verifica el número
      `);
    }
    return false;
  }
}

// Función para obtener la respuesta según la opción
async function getResponseForOption(optionId) {
  switch (optionId) {
    case 'opcion_1':
      return `🌎 *Nuestros Destinos Turísticos*\n\n` +
             `Selecciona un destino para más información:\n\n` +
             `1️⃣ Cancún - Playas paradisíacas\n` +
             `2️⃣ Ciudad de México - Historia y cultura\n` +
             `3️⃣ Los Cabos - Aventura y lujo\n` +
             `4️⃣ Puerto Vallarta - Belleza natural\n\n` +
             `Responde con el número del destino o escribe "menu" para ver más opciones.`;
    
    case 'opcion_2':
      return `🚗 *Opciones de Transporte*\n\n` +
             `¿Qué tipo de transporte te interesa?\n\n` +
             `1️⃣ Vuelos\n` +
             `2️⃣ Autobuses\n` +
             `3️⃣ Renta de autos\n` +
             `4️⃣ Traslados aeropuerto-hotel\n\n` +
             `Responde con el número de la opción o escribe "menu" para volver al menú principal.`;
    
    case 'opcion_3':
      return `💰 *Precios y Paquetes*\n\n` +
             `Tenemos diferentes opciones para tu presupuesto:\n\n` +
             `1️⃣ Paquetes económicos\n` +
             `2️⃣ Paquetes estándar\n` +
             `3️⃣ Paquetes premium\n` +
             `4️⃣ Paquetes todo incluido\n\n` +
             `¿Cuál te interesa conocer? Responde con el número o escribe "menu" para más opciones.`;
    
    case 'opcion_4':
      return `👋 *Atención Personalizada*\n\n` +
             `Un agente se pondrá en contacto contigo pronto.\n` +
             `Mientras tanto, ¿podrías decirnos?\n\n` +
             `1️⃣ ¿Para cuándo planeas tu viaje?\n` +
             `2️⃣ ¿Cuántas personas viajarán?\n` +
             `3️⃣ ¿Tienes un destino en mente?\n\n` +
             `Responde con el número de la pregunta que quieras contestar primero.`;
    
    default:
      return 'Lo siento, no entendí tu selección. Por favor, escribe "menu" para ver las opciones disponibles.';
  }
}

// Función para manejar respuestas específicas de cada opción
async function handleSpecificResponse(option, subOption, userPhoneNumber) {
  let response = '';
  
  switch (option) {
    case 'opcion_1': // Destinos
      switch (subOption) {
        case '1':
          response = `🏖️ *Cancún*\n\n` +
                    `Paquetes desde $5,000 MXN por persona\n` +
                    `✅ Vuelo redondo\n` +
                    `✅ Hotel 4 estrellas\n` +
                    `✅ Traslados\n\n` +
                    `¿Te gustaría:\n` +
                    `1️⃣ Ver hoteles disponibles\n` +
                    `2️⃣ Conocer actividades\n` +
                    `3️⃣ Cotizar paquete\n`;
          break;
        // ... más casos para otros destinos
      }
      break;
    
    case 'opcion_2': // Transporte
      // Lógica para opciones de transporte
      break;
    
    case 'opcion_3': // Precios
      // Lógica para opciones de precios
      break;
    
    case 'opcion_4': // Atención personalizada
      // Lógica para atención personalizada
      break;
  }
  
  return response;
}

// Modificar la función handleUserResponse para manejar subopciones
async function handleUserResponse(optionId, userPhoneNumber, subOption = null) {
  try {
    const formattedNumber = await formatPhoneNumber(userPhoneNumber);
    let messageBody;

    if (subOption) {
      messageBody = await handleSpecificResponse(optionId, subOption, formattedNumber);
    } else {
      messageBody = await getResponseForOption(optionId);
    }

    const result = await axios.post(
      `https://graph.facebook.com/v20.0/${whatsappPhoneId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: formattedNumber,
        type: 'text',
        text: { body: messageBody }
      },
      {
        headers: {
          'Authorization': `Bearer ${whatsappToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Mensaje enviado exitosamente:', result.data);
    return result.data;
  } catch (error) {
    console.error('❌ Error al enviar mensaje:', error.response?.data || error.message);
    throw error;
  }
}

// Función para enviar el menú inicial
async function sendInitialMenu(userPhoneNumber) {
  try {
    const formattedNumber = await formatPhoneNumber(userPhoneNumber);
    console.log('📤 Enviando menú inicial a:', formattedNumber);
    
    // Verificar que el número está permitido
    const isVerified = await verifyPhoneNumber(formattedNumber);
    if (!isVerified) {
      throw new Error(`Número no autorizado: ${formattedNumber}. Por favor, agrégalo a la lista de números de prueba.`);
    }

    const menuMessage = {
      messaging_product: 'whatsapp',
      to: formattedNumber,
      type: 'interactive',
      interactive: {
        type: 'list',
        header: {
          type: 'text',
          text: '¡Bienvenido a nuestra agencia de viajes! 🌎'
        },
        body: {
          text: 'Por favor, selecciona una opción para ayudarte:'
        },
        footer: {
          text: 'Gracias por contactarnos'
        },
        action: {
          button: 'Ver opciones',
          sections: [
            {
              title: 'Servicios disponibles',
              rows: [
                {
                  id: 'opcion_1',
                  title: 'Destinos turísticos',
                  description: 'Conoce nuestros destinos disponibles'
                },
                {
                  id: 'opcion_2',
                  title: 'Reservar transporte',
                  description: 'Opciones de transporte y reservas'
                },
                {
                  id: 'opcion_3',
                  title: 'Precios y paquetes',
                  description: 'Información sobre precios'
                },
                {
                  id: 'opcion_4',
                  title: 'Hablar con un agente',
                  description: 'Contacta a un agente en vivo'
                }
              ]
            }
          ]
        }
      }
    };

    const result = await axios.post(
      `https://graph.facebook.com/v20.0/${whatsappPhoneId}/messages`,
      menuMessage,
      {
        headers: {
          'Authorization': `Bearer ${whatsappToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Menú inicial enviado exitosamente:', result.data);
    return result.data;
  } catch (error) {
    console.error('❌ Error al enviar menú inicial:', error.message);
    throw error;
  }
}

// Función para iniciar el servidor y el túnel de Ngrok
async function startServer() {
  try {
    // Inicia Ngrok en el puerto especificado
    const url = await ngrok.connect(port);
    console.log(`Ngrok tunnel opened at ${url}`);

    // Imprime la URL del túnel para configurarla como el webhook en Facebook
    console.log(`Configura esta URL en Facebook Webhook: ${url}/webhook`);
    
    // Inicia el servidor Express
    app.listen(port, () => {
      console.log(`Servidor corriendo en http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Error al iniciar Ngrok:', error.message);
  }
}

// Nueva ruta para enviar mensaje de prueba
app.get('/send-test/:phoneNumber', async (req, res) => {
  const phoneNumber = req.params.phoneNumber;
  
  try {
    // Primero enviamos un mensaje de saludo
    await axios.post(
      `https://graph.facebook.com/v20.0/${whatsappPhoneId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: {
          body: '¡Hola! Bienvenido a nuestra agencia de viajes.'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${whatsappToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Luego enviamos el menú
    await sendInitialMenu(phoneNumber);
    
    res.status(200).json({ message: 'Mensajes enviados correctamente' });
  } catch (error) {
    console.error('Error al enviar mensajes:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Error al enviar mensajes' });
  }
});

// Función para verificar el estado de un número
async function verifyPhoneNumber(phoneNumber) {
  console.log(`🔍 Verificando número: ${phoneNumber}`);
  
  try {
    // Primero intentamos enviar un mensaje de prueba
    const response = await axios.post(
      `https://graph.facebook.com/v20.0/${whatsappPhoneId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: {
          body: '🔍 Verificando conexión...'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${whatsappToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Número verificado:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    if (error.response?.data?.error?.code === 131030) {
      console.error(`
🚨 INSTRUCCIONES PARA AGREGAR NÚMERO:
1. Ve a https://developers.facebook.com/apps
2. Selecciona tu aplicación
3. Ve a "WhatsApp > Configuración"
4. En "Números de teléfono para pruebas"
5. Haz clic en "Agregar número de teléfono"
6. Ingresa: +${phoneNumber}
7. Verifica el número
      `);
    }
    return false;
  }
}

// Ruta para verificar un número
app.get('/verify/:phoneNumber', async (req, res) => {
  const phoneNumber = req.params.phoneNumber;
  try {
    const isVerified = await verifyPhoneNumber(phoneNumber);
    res.json({ 
      success: isVerified, 
      message: isVerified ? 
        'Número verificado correctamente' : 
        'El número no está autorizado'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Agregar un objeto para mantener el estado de la conversación
const userStates = {};

// Función para manejar las respuestas de texto
async function handleTextMessage(message, userPhoneNumber) {
  const userState = userStates[userPhoneNumber] || { lastOption: null };
  const text = message.text.body.toLowerCase();

  console.log(`🤖 Procesando mensaje de texto: ${text}`);
  console.log(`🔄 Estado actual del usuario:`, userState);

  // Comando menu
  if (text === 'menu') {
    console.log('📋 Comando menu detectado - Regresando al menú principal');
    userStates[userPhoneNumber] = { lastOption: null };
    await sendInitialMenu(userPhoneNumber);
    return null;
  }

  // Manejar respuestas según el estado anterior
  if (userState.lastOption === 'opcion_1') {
    switch (text) {
      case '1':
        userStates[userPhoneNumber].destination = 'cancun';
        return {
          body: `🌴 *Cancún*\n\n` +
                `Descubre el paraíso en el Caribe mexicano:\n\n` +
                `✨ Playas de arena blanca\n` +
                `✨ Aguas turquesas\n` +
                `✨ Vida nocturna vibrante\n\n` +
                `*Paquetes desde $5,000 MXN*\n\n` +
                `¿Qué te gustaría conocer?\n\n` +
                `1️⃣ Hoteles disponibles\n` +
                `2️⃣ Actividades y tours\n` +
                `3️⃣ Solicitar cotización\n` +
                `4️⃣ Volver al menú principal`
        };
      case '2':
        userStates[userPhoneNumber].destination = 'cdmx';
        return {
          body: `🏛️ *Ciudad de México*\n\n` +
                `La capital cultural de México:\n\n` +
                `✨ Centro histórico\n` +
                `✨ Museos y galerías\n` +
                `✨ Gastronomía única\n\n` +
                `*Paquetes desde $3,000 MXN*\n\n` +
                `¿Qué te gustaría conocer?\n\n` +
                `1️⃣ Hoteles disponibles\n` +
                `2️⃣ Actividades y tours\n` +
                `3️⃣ Solicitar cotización\n` +
                `4️⃣ Volver al menú principal`
        };
      case '3':
        userStates[userPhoneNumber].destination = 'loscabos';
        return {
          body: `🌊 *Los Cabos*\n\n` +
                `Lujo y aventura en el Pacífico:\n\n` +
                `✨ Arco natural\n` +
                `✨ Resorts de lujo\n` +
                `✨ Pesca deportiva\n\n` +
                `*Paquetes desde $7,000 MXN*\n\n` +
                `¿Qué te gustaría conocer?\n\n` +
                `1️⃣ Hoteles disponibles\n` +
                `2️⃣ Actividades y tours\n` +
                `3️⃣ Solicitar cotización\n` +
                `4️⃣ Volver al menú principal`
        };
      case '4':
        userStates[userPhoneNumber].destination = 'vallarta';
        return {
          body: `🏖️ *Puerto Vallarta*\n\n` +
                `El encanto del Pacífico mexicano:\n\n` +
                `✨ Playas hermosas\n` +
                `✨ Malecón pintoresco\n` +
                `✨ Cultura local\n\n` +
                `*Paquetes desde $4,500 MXN*\n\n` +
                `¿Qué te gustaría conocer?\n\n` +
                `1️⃣ Hoteles disponibles\n` +
                `2️⃣ Actividades y tours\n` +
                `3️⃣ Solicitar cotización\n` +
                `4️⃣ Volver al menú principal`
        };
      default:
        return {
          body: `❌ Opción no válida. Por favor, selecciona un número del 1 al 4 o escribe "menu" para volver al inicio.`
        };
    }
  } else if (userState.destination) {
    // Manejar subopciones de destinos
    switch (text) {
      case '1':
        return {
          body: `🏨 *Hoteles disponibles en ${userState.destination}*\n\n` +
                `Aquí tienes nuestras mejores opciones:\n\n` +
                `1. Hotel 5⭐ - $3,000/noche\n` +
                `2. Hotel 4⭐ - $2,000/noche\n` +
                `3. Hotel 3⭐ - $1,000/noche\n\n` +
                `Responde con el número para más detalles o "menu" para volver al inicio.`
        };
      case '2':
        return {
          body: `🎯 *Actividades y tours en ${userState.destination}*\n\n` +
                `Descubre nuestras experiencias:\n\n` +
                `1. Tour cultural - $500\n` +
                `2. Aventura extrema - $800\n` +
                `3. Tour gastronómico - $600\n\n` +
                `Responde con el número para más detalles o "menu" para volver al inicio.`
        };
      case '3':
        return {
          body: `💰 *Cotización para ${userState.destination}*\n\n` +
                `Para brindarte la mejor cotización, necesitamos:\n\n` +
                `1. ¿Cuántas personas viajan?\n` +
                `2. ¿Cuántas noches?\n` +
                `3. ¿Fecha aproximada?\n\n` +
                `Responde estas preguntas y un asesor te contactará pronto.`
        };
      case '4':
        userStates[userPhoneNumber] = { lastOption: null };
        await sendInitialMenu(userPhoneNumber);
        return null;
    }
  }

  return {
    body: `Lo siento, no entendí tu mensaje. Escribe "menu" para ver las opciones disponibles.`
  };
}

// Función para crear un mensaje de lista interactiva
function createListMessage(phoneNumber, header, body, footer, options) {
  return {
    messaging_product: 'whatsapp',
    to: phoneNumber,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: {
        type: 'text',
        text: header
      },
      body: {
        text: body
      },
      footer: {
        text: footer
      },
      action: {
        button: 'Ver opciones',
        sections: [
          {
            title: 'Opciones disponibles',
            rows: options
          }
        ]
      }
    }
  };
}

// Función para manejar las respuestas específicas de destinos
async function handleDestinationResponse(destination, phoneNumber) {
  const destinationOptions = {
    cancun: {
      header: '🌴 Cancún',
      body: 'Descubre el paraíso en el Caribe mexicano:\n\n' +
            '✨ Playas de arena blanca\n' +
            '✨ Aguas turquesas\n' +
            '✨ Vida nocturna vibrante\n\n' +
            '*Paquetes desde $5,000 MXN*',
      footer: 'Selecciona una opción para más información'
    },
    cdmx: {
      header: '🏛️ Ciudad de México',
      body: 'La capital cultural de México:\n\n' +
            '✨ Centro histórico\n' +
            '✨ Museos y galerías\n' +
            '✨ Gastronomía única\n\n' +
            '*Paquetes desde $3,000 MXN*',
      footer: 'Selecciona una opción para más información'
    },
    // ... otros destinos ...
  };

  const options = [
    {
      id: `${destination}_hotels`,
      title: '🏨 Hoteles disponibles',
      description: 'Ver opciones de hospedaje'
    },
    {
      id: `${destination}_tours`,
      title: '🎯 Tours y actividades',
      description: 'Conoce nuestras experiencias'
    },
    {
      id: `${destination}_quote`,
      title: '💰 Solicitar cotización',
      description: 'Obtén un presupuesto personalizado'
    },
    {
      id: 'menu_principal',
      title: '🏠 Menú principal',
      description: 'Volver al inicio'
    }
  ];

  const destInfo = destinationOptions[destination];
  return createListMessage(
    phoneNumber,
    destInfo.header,
    destInfo.body,
    destInfo.footer,
    options
  );
}

// Función para manejar las opciones de hoteles
async function handleHotelsMenu(destination, phoneNumber) {
  const options = [
    {
      id: `${destination}_hotel_5`,
      title: 'Hotel 5 estrellas',
      description: 'Lujo y confort - Desde $3,000/noche'
    },
    {
      id: `${destination}_hotel_4`,
      title: 'Hotel 4 estrellas',
      description: 'Calidad superior - Desde $2,000/noche'
    },
    {
      id: `${destination}_hotel_3`,
      title: 'Hotel 3 estrellas',
      description: 'Buena relación - Desde $1,000/noche'
    },
    {
      id: `${destination}_back`,
      title: '↩️ Regresar',
      description: 'Volver al menú anterior'
    }
  ];

  return createListMessage(
    phoneNumber,
    '🏨 Hoteles Disponibles',
    `Opciones de hospedaje en ${destination}`,
    'Selecciona un hotel para más detalles',
    options
  );
}

// Función para manejar las opciones de tours
async function handleToursMenu(destination, phoneNumber) {
  const options = [
    {
      id: `${destination}_tour_cultural`,
      title: 'Tour Cultural',
      description: 'Historia y tradiciones - $500'
    },
    {
      id: `${destination}_tour_aventura`,
      title: 'Aventura Extrema',
      description: 'Adrenalina pura - $800'
    },
    {
      id: `${destination}_tour_gastro`,
      title: 'Tour Gastronómico',
      description: 'Sabores locales - $600'
    },
    {
      id: `${destination}_back`,
      title: '↩️ Regresar',
      description: 'Volver al menú anterior'
    }
  ];

  return createListMessage(
    phoneNumber,
    '🎯 Tours y Actividades',
    `Experiencias disponibles en ${destination}`,
    'Selecciona un tour para más detalles',
    options
  );
}

// Modificar la función processMessage para manejar las nuevas opciones
async function processMessage(message) {
  const userPhoneNumber = message.from;
  
  if (message.type === 'interactive') {
    const selectedOption = message.interactive.list_reply.id;
    console.log(`🎯 Opción seleccionada: ${selectedOption}`);

    if (selectedOption.includes('_hotels')) {
      const destination = selectedOption.split('_')[0];
      await handleHotelsMenu(destination, userPhoneNumber);
    } else if (selectedOption.includes('_tours')) {
      const destination = selectedOption.split('_')[0];
      await handleToursMenu(destination, userPhoneNumber);
    } else if (selectedOption === 'menu_principal') {
      await sendInitialMenu(userPhoneNumber);
    } else {
      // Manejar otras opciones interactivas
      const response = await getResponseForOption(selectedOption);
      if (response) {
        await handleUserResponse(response, userPhoneNumber);
      }
    }
  } else if (message.type === 'text') {
    // Manejar comandos de texto como "menu"
    if (message.text.body.toLowerCase() === 'menu') {
      await sendInitialMenu(userPhoneNumber);
    }
  }
}

// Llama a la función para iniciar el servidor y Ngrok
startServer();
