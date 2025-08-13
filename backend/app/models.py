from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from .database import Base

class Empresa(Base):
    __tablename__ = "empresas"
    id = Column(Integer, primary_key=True, index=True)
    id_empresa = Column(String(4), unique=True, index=True, nullable=False)  # "0001"
    nome = Column(String, nullable=False)

    # cascade garante remoção de Unidades/Itens ao deletar a Empresa
    unidades = relationship(
        "Unidade",
        back_populates="empresa",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

class Unidade(Base):
    __tablename__ = "unidades"
    id = Column(Integer, primary_key=True, index=True)
    id_unidade = Column(String(3), nullable=False, index=True)  # "001"
    nome = Column(String, nullable=False)

    empresa_id = Column(
        Integer,
        ForeignKey("empresas.id", ondelete="CASCADE"),
        nullable=False
    )
    empresa = relationship("Empresa", back_populates="unidades")

    itens = relationship(
        "Item",
        back_populates="unidade",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        UniqueConstraint("empresa_id", "id_unidade", name="uq_unidade_por_empresa"),
    )

class Item(Base):
    __tablename__ = "itens"
    id = Column(Integer, primary_key=True, index=True)

    id_item = Column(String, index=True, nullable=False)      # ex: FAT-2025-01
    tipo = Column(String, nullable=False)                      # FAT, NE-CP, DOC-ADT, CCEE-CFZ003...
    ano_mes = Column(String, nullable=True)                    # YYYY-MM
    titulo_visivel = Column(String, nullable=False)
    caminho_arquivo = Column(String, nullable=False)

    unidade_id = Column(
        Integer,
        ForeignKey("unidades.id", ondelete="CASCADE"),
        nullable=False
    )
    unidade = relationship("Unidade", back_populates="itens")

    __table_args__ = (
        UniqueConstraint("unidade_id", "id_item", name="uq_item_por_unidade"),
    )
