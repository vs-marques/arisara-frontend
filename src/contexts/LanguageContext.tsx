import React, { createContext, useContext, useEffect, useState } from 'react';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

/**
 * Idiomas disponíveis
 */
export type LanguageType = 'pt-BR' | 'en' | 'es';

/**
 * Interface do contexto de idioma
 */
interface LanguageContextType {
  language: LanguageType;
  setLanguage: (lang: LanguageType) => void;
  t: (key: string, options?: any) => string;
}

/**
 * Contexto de idioma
 */
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/**
 * Hook personalizado para usar o contexto de idioma
 */
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage deve ser usado dentro de um LanguageProvider');
  }
  return context;
};

/**
 * Recursos de tradução
 */
const resources = {
  'pt-BR': {
    translation: {
      // Navegação
      'nav.dashboard': 'Dashboard',
      'nav.participants': 'Participantes',
      'nav.transactions': 'Transações',
      'nav.reports': 'Relatórios',
      'nav.settings': 'Configurações',
      
      // Tema
      'theme.light': 'Claro',
      'theme.dark': 'Escuro',
      'theme.toggle': 'Alternar Tema',
      
      // Idioma
      'language.pt-BR': 'Português',
      'language.en': 'English',
      'language.es': 'Español',
      'language.select': 'Selecionar Idioma',
      
      // Participantes
      'participants.title': 'Participantes',
      'participants.add': 'Adicionar Participante',
      'participants.edit': 'Editar Participante',
      'participants.delete': 'Excluir Participante',
      'participants.deactivate': 'Desativar Participante',
      'participants.search': 'Buscar participantes...',
      'participants.nature.pf': 'Pessoa Física',
      'participants.nature.pj': 'Pessoa Jurídica',
      'participants.category.consumer': 'Inquilino',
      'participants.category.provider': 'Provedor',
      'participants.category.supplier': 'Proprietário',
      'participants.category.superadmin': 'Super Administrador',
      
      // Formulários
      'form.name': 'Nome',
      'form.email': 'E-mail',
      'form.phone': 'Telefone',
      'form.cpf': 'CPF',
      'form.cnpj': 'CNPJ',
      'form.birthDate': 'Data de Nascimento',
      'form.companyName': 'Razão Social',
      'form.domain': 'Domínio',
      'form.category': 'Categoria',
      'form.nature': 'Natureza',
      'form.address': 'Endereço',
      'form.zipcode': 'CEP',
      'form.street': 'Logradouro',
      'form.number': 'Número',
      'form.complement': 'Complemento',
      'form.neighborhood': 'Bairro',
      'form.city': 'Cidade',
      'form.state': 'Estado',
      
      // Ações
      'actions.save': 'Salvar',
      'actions.cancel': 'Cancelar',
      'actions.edit': 'Editar',
      'actions.delete': 'Excluir',
      'actions.deactivate': 'Desativar',
      'actions.confirm': 'Confirmar',
      'actions.close': 'Fechar',
      'actions.logout': 'Sair',
      
      // Status
      'status.active': 'Ativo',
      'status.inactive': 'Inativo',
      'status.excluded': 'Excluído',
      'status.pending': 'Pendente',
      'status.approved': 'Aprovado',
      'status.rejected': 'Rejeitado',
      
      // Mensagens
      'message.success': 'Operação realizada com sucesso!',
      'message.error': 'Erro ao realizar operação',
      'message.confirmDelete': 'Tem certeza que deseja excluir este participante?',
      'message.confirmDeactivate': 'Tem certeza que deseja desativar este participante?',
      'message.deleteExplanation': 'O participante será marcado como excluído e removido da lista. Após 30 dias, será excluído permanentemente.',
      'message.deactivateExplanation': 'O participante será desativado e não poderá fazer login, mas permanecerá visível na lista.',
      
      // Validações
      'validation.required': 'Campo obrigatório',
      'validation.email': 'E-mail inválido',
      'validation.cpf': 'CPF inválido',
      'validation.cnpj': 'CNPJ inválido',
      'validation.phone': 'Telefone inválido',
      'validation.zipcode': 'CEP inválido',
      
      // Geral
      'common.loading': 'Carregando...',
      'common.noData': 'Nenhum dado encontrado',
      'common.auto': 'Auto',
      'common.manual': 'Manual',
    }
  },
  'en': {
    translation: {
      // Navigation
      'nav.dashboard': 'Dashboard',
      'nav.participants': 'Participants',
      'nav.transactions': 'Transactions',
      'nav.reports': 'Reports',
      'nav.settings': 'Settings',
      
      // Theme
      'theme.light': 'Light',
      'theme.dark': 'Dark',
      'theme.toggle': 'Toggle Theme',
      
      // Language
      'language.pt-BR': 'Português',
      'language.en': 'English',
      'language.es': 'Español',
      'language.select': 'Select Language',
      
      // Participants
      'participants.title': 'Participants',
      'participants.add': 'Add Participant',
      'participants.edit': 'Edit Participant',
      'participants.delete': 'Delete Participant',
      'participants.deactivate': 'Deactivate Participant',
      'participants.search': 'Search participants...',
      'participants.nature.pf': 'Individual',
      'participants.nature.pj': 'Company',
      'participants.category.consumer': 'Tenant',
      'participants.category.provider': 'Provider',
      'participants.category.supplier': 'Owner',
      'participants.category.superadmin': 'Super Administrator',
      
      // Forms
      'form.name': 'Name',
      'form.email': 'Email',
      'form.phone': 'Phone',
      'form.cpf': 'CPF',
      'form.cnpj': 'CNPJ',
      'form.birthDate': 'Birth Date',
      'form.companyName': 'Company Name',
      'form.domain': 'Domain',
      'form.category': 'Category',
      'form.nature': 'Nature',
      'form.address': 'Address',
      'form.zipcode': 'Zip Code',
      'form.street': 'Street',
      'form.number': 'Number',
      'form.complement': 'Complement',
      'form.neighborhood': 'Neighborhood',
      'form.city': 'City',
      'form.state': 'State',
      
      // Actions
      'actions.save': 'Save',
      'actions.cancel': 'Cancel',
      'actions.edit': 'Edit',
      'actions.delete': 'Delete',
      'actions.deactivate': 'Deactivate',
      'actions.confirm': 'Confirm',
      'actions.close': 'Close',
      'actions.logout': 'Logout',
      
      // Status
      'status.active': 'Active',
      'status.inactive': 'Inactive',
      'status.excluded': 'Excluded',
      'status.pending': 'Pending',
      'status.approved': 'Approved',
      'status.rejected': 'Rejected',
      
      // Messages
      'message.success': 'Operation completed successfully!',
      'message.error': 'Error performing operation',
      'message.confirmDelete': 'Are you sure you want to delete this participant?',
      'message.confirmDeactivate': 'Are you sure you want to deactivate this participant?',
      'message.deleteExplanation': 'The participant will be marked as excluded and removed from the list. After 30 days, it will be permanently deleted.',
      'message.deactivateExplanation': 'The participant will be deactivated and cannot login, but will remain visible in the list.',
      
      // Validations
      'validation.required': 'Required field',
      'validation.email': 'Invalid email',
      'validation.cpf': 'Invalid CPF',
      'validation.cnpj': 'Invalid CNPJ',
      'validation.phone': 'Invalid phone',
      'validation.zipcode': 'Invalid zip code',
      
      // General
      'common.loading': 'Loading...',
      'common.noData': 'No data found',
      'common.auto': 'Auto',
      'common.manual': 'Manual',
    }
  },
  'es': {
    translation: {
      // Navegación
      'nav.dashboard': 'Panel',
      'nav.participants': 'Participantes',
      'nav.transactions': 'Transacciones',
      'nav.reports': 'Reportes',
      'nav.settings': 'Configuraciones',
      
      // Tema
      'theme.light': 'Claro',
      'theme.dark': 'Oscuro',
      'theme.toggle': 'Cambiar Tema',
      
      // Idioma
      'language.pt-BR': 'Português',
      'language.en': 'English',
      'language.es': 'Español',
      'language.select': 'Seleccionar Idioma',
      
      // Participantes
      'participants.title': 'Participantes',
      'participants.add': 'Agregar Participante',
      'participants.edit': 'Editar Participante',
      'participants.delete': 'Eliminar Participante',
      'participants.deactivate': 'Desactivar Participante',
      'participants.search': 'Buscar participantes...',
      'participants.nature.pf': 'Persona Física',
      'participants.nature.pj': 'Persona Jurídica',
      'participants.category.consumer': 'Inquilino',
      'participants.category.provider': 'Proveedor',
      'participants.category.supplier': 'Propietario',
      'participants.category.superadmin': 'Super Administrador',
      
      // Formularios
      'form.name': 'Nombre',
      'form.email': 'Correo Electrónico',
      'form.phone': 'Teléfono',
      'form.cpf': 'CPF',
      'form.cnpj': 'CNPJ',
      'form.birthDate': 'Fecha de Nacimiento',
      'form.companyName': 'Razón Social',
      'form.domain': 'Dominio',
      'form.category': 'Categoría',
      'form.nature': 'Naturaleza',
      'form.address': 'Dirección',
      'form.zipcode': 'Código Postal',
      'form.street': 'Calle',
      'form.number': 'Número',
      'form.complement': 'Complemento',
      'form.neighborhood': 'Barrio',
      'form.city': 'Ciudad',
      'form.state': 'Estado',
      
      // Acciones
      'actions.save': 'Guardar',
      'actions.cancel': 'Cancelar',
      'actions.edit': 'Editar',
      'actions.delete': 'Eliminar',
      'actions.deactivate': 'Desactivar',
      'actions.confirm': 'Confirmar',
      'actions.close': 'Cerrar',
      'actions.logout': 'Cerrar Sesión',
      
      // Estado
      'status.active': 'Activo',
      'status.inactive': 'Inactivo',
      'status.excluded': 'Excluido',
      'status.pending': 'Pendiente',
      'status.approved': 'Aprobado',
      'status.rejected': 'Rechazado',
      
      // Mensajes
      'message.success': '¡Operación completada con éxito!',
      'message.error': 'Error al realizar la operación',
      'message.confirmDelete': '¿Está seguro de que desea eliminar este participante?',
      'message.confirmDeactivate': '¿Está seguro de que desea desactivar este participante?',
      'message.deleteExplanation': 'El participante será marcado como excluido y removido de la lista. Después de 30 días, será eliminado permanentemente.',
      'message.deactivateExplanation': 'El participante será desactivado y no podrá iniciar sesión, pero permanecerá visible en la lista.',
      
      // Validaciones
      'validation.required': 'Campo requerido',
      'validation.email': 'Correo electrónico inválido',
      'validation.cpf': 'CPF inválido',
      'validation.cnpj': 'CNPJ inválido',
      'validation.phone': 'Teléfono inválido',
      'validation.zipcode': 'Código postal inválido',
      
      // General
      'common.loading': 'Cargando...',
      'common.noData': 'No se encontraron datos',
      'common.auto': 'Auto',
      'common.manual': 'Manual',
    }
  }
};

/**
 * Configuração do i18next
 */
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'pt-BR',
    debug: false,
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    
    interpolation: {
      escapeValue: false,
    },
  });

/**
 * Provider do contexto de idioma
 * 
 * Gerencia o estado do idioma e integra com i18next
 * para fornecer traduções dinâmicas.
 * 
 * @version 1.0.0
 * @author Arisara Team
 */
export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageType>('pt-BR');

  // Carregar idioma do localStorage na inicialização
  useEffect(() => {
    const savedLanguage = localStorage.getItem('app-language') as LanguageType;
    if (savedLanguage && ['pt-BR', 'en', 'es'].includes(savedLanguage)) {
      setLanguageState(savedLanguage);
      i18n.changeLanguage(savedLanguage);
    }
  }, []);

  // Alterar idioma
  const setLanguage = (lang: LanguageType) => {
    setLanguageState(lang);
    i18n.changeLanguage(lang);
    localStorage.setItem('app-language', lang);
  };

  // Função de tradução
  const t = (key: string, options?: any) => {
    return i18n.t(key, options);
  };

  const value: LanguageContextType = {
    language,
    setLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageProvider; 