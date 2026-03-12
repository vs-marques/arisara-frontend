// stores/useCadastroStore.ts
import { create } from 'zustand';

interface CadastroData {
  nomeCompleto: string;
  email: string;
  telefone: string;
  cpf: string;
  senha: string;
  confirmarSenha: string;
  dataNascimento: string;
}

interface Store {
  formData: CadastroData;
  setFormData: (data: Partial<CadastroData>) => void;
  resetForm: () => void;
}

export const useCadastroStore = create<Store>((set) => ({
  formData: {
    nomeCompleto: '',
    email: '',
    telefone: '',
    cpf: '',
    senha: '',
    confirmarSenha: '',
    dataNascimento: '',
  },
  setFormData: (data) => set((state) => ({
    formData: { ...state.formData, ...data }
  })),
  resetForm: () => set({
    formData: {
      nomeCompleto: '',
      email: '',
      telefone: '',
      cpf: '',
      senha: '',
      confirmarSenha: '',
      dataNascimento: '',
    }
  })
}));
