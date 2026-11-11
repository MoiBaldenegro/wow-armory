import { useId, useState } from 'react';
import { auctionItemIds } from '../../../application/armory/ArmoryQueries';
import type { AuctionPrices, WowMode } from '../../../domain/armory/Armory';
import type { CharacterEquipmentItem } from '../../../domain/character/CharacterDetails';
import { useArmoryResource } from '../../hooks/useArmoryResource';
import { formatGold, qualityClass } from '../../utils/armoryFormat';
import { Icon } from '../ui/Icon';
import { SectionHeading } from '../ui/SectionHeading';

interface CharacterEquipmentProps {
  equipment: CharacterEquipmentItem[];
  realmSlug?: string;
  mode?: WowMode;
  faction?: string;
}

function ItemTooltip({
  item,
  price,
  auctionHouse,
}: {
  item: CharacterEquipmentItem;
  price?: AuctionPrices['prices'][string];
  auctionHouse?: string;
}) {
  const typeLine = [...new Set([item.inventoryType, item.itemType].filter(Boolean))].join(' · ');

  return (
    <div className="item-tooltip">
      <p className={`item-tooltip-name ${qualityClass(item.qualityType) ?? ''}`}>{item.name}</p>
      {item.level !== undefined && <p className="item-tooltip-ilvl">Nivel de objeto {item.level}</p>}
      {item.binding && <p>{item.binding}</p>}
      {typeLine && <p>{typeLine}</p>}
      {item.weapon && (
        <>
          {item.weapon.damage && (
            <p>
              {item.weapon.damage}
              {item.weapon.speed ? ` · ${item.weapon.speed}` : ''}
            </p>
          )}
          {item.weapon.dps && <p>{item.weapon.dps}</p>}
        </>
      )}
      {item.armor && <p>{item.armor}</p>}
      {item.stats?.map((stat) => (
        <p
          key={stat.text}
          className={
            stat.negated
              ? 'item-stat-negated'
              : stat.color
                ? 'item-stat-bonus'
                : 'item-stat'
          }
        >
          {stat.text}
        </p>
      ))}
      {item.enchantments?.map((text) => (
        <p key={text} className="item-enchant">
          {text}
        </p>
      ))}
      {item.sockets?.map((text, index) => (
        <p key={`${text}-${index}`} className="item-socket">
          {text}
        </p>
      ))}
      {item.durability && <p>{item.durability}</p>}
      {item.requirements?.map((text) => (
        <p key={text}>{text}</p>
      ))}
      {item.spells?.map((text) => (
        <p key={text} className="item-spell">
          {text}
        </p>
      ))}
      {item.set && (
        <div className="item-set">
          <p className="item-set-name">{item.set.name}</p>
          <ul>
            {item.set.items.map((piece) => (
              <li key={piece.name} className={piece.equipped ? 'item-set-on' : 'item-set-off'}>
                {piece.name}
              </li>
            ))}
          </ul>
          {item.set.effects.map((effect) => (
            <p key={effect.text} className={effect.active ? 'item-set-on' : 'item-set-off'}>
              {effect.text}
            </p>
          ))}
        </div>
      )}
      {item.description && <p className="item-description">“{item.description}”</p>}
      {price && (
        <p className="item-price">
          <Icon name="globe" size={14} /> Subasta{auctionHouse ? ` (${auctionHouse})` : ''}:{' '}
          <strong>{formatGold(price.minBuyout)}</strong> · {price.quantity} en venta
        </p>
      )}
    </div>
  );
}

function EquipmentItem({
  item,
  prices,
}: {
  item: CharacterEquipmentItem;
  prices?: AuctionPrices;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const price =
    item.itemId !== undefined ? prices?.prices[String(item.itemId)] : undefined;

  return (
    <li className={`equipment-item${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="equipment-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        {item.iconUrl ? (
          <img src={item.iconUrl} alt="" className="item-icon" loading="lazy" />
        ) : (
          <span className="item-placeholder" aria-hidden="true">
            <Icon name="shield" size={18} />
          </span>
        )}
        <span className="item-body">
          <span className={`item-name ${qualityClass(item.qualityType) ?? ''}`}>{item.name}</span>
          <span className="item-meta">
            {item.slot}
            {item.level !== undefined ? ` · Nivel ${item.level}` : ''}
            {price ? ` · ${formatGold(price.minBuyout)}` : ''}
          </span>
        </span>
      </button>
      <div id={panelId} hidden={!open}>
        {open && <ItemTooltip item={item} price={price} auctionHouse={prices?.auctionHouse} />}
      </div>
    </li>
  );
}

export function CharacterEquipment({ equipment, realmSlug, mode, faction }: CharacterEquipmentProps) {
  const ids = auctionItemIds(equipment);
  const prices = useArmoryResource<AuctionPrices>(
    realmSlug && mode && ids.length ? `${mode}/${realmSlug}/${faction ?? ''}/${ids.join(',')}` : null,
    (armory) => armory.auctionPrices(realmSlug ?? '', equipment, faction, mode ?? 'classic'),
    (value) => Object.keys(value.prices).length === 0,
  );

  return (
    <section className="mx-card equipment-section" aria-labelledby="character-equipment-title">
      <SectionHeading id="character-equipment-title">Equipamiento</SectionHeading>
      <p className="mx-text--secondary equipment-hint">Toca un objeto para ver sus detalles.</p>
      <ul className="equipment-grid">
        {equipment.map((item) => (
          <EquipmentItem
            key={`${item.slot}-${item.name}`}
            item={item}
            prices={prices.status === 'success' ? prices.data : undefined}
          />
        ))}
      </ul>
    </section>
  );
}
