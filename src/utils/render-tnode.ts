import { h, isVNode, createTextVNode, VNode, ComponentPublicInstance, Slots } from 'vue';
import { TNode } from '../common';

// 组件render属性的ts类型
type RenderTsTypesSimple = string | number | boolean;
type RenderTsTypesObject = Record<string, any> | Array<any>;
type RenderTsTypes  = VNode | TNode | RenderTsTypesSimple | RenderTsTypesObject;

// 定义组件内容的渲染方式
enum RenderWay {
  Text = 'text',
  JsonString = 'jsonstring',
  VNode = 'vnode',
  Unknown = 'unknown'
}


/**
 * 根据传入的值（对象），判断渲染该值（对象）的方式
 * @param value 传入的值（对象）
 */
const getValueRenderWay = (value: RenderTsTypes): RenderWay => {
  // 简单类型
  if (['string', 'number', 'boolean'].includes(typeof value)) return RenderWay.Text;
  // 复杂对象
  if (typeof value === 'object') {
    // 虚拟dom对象
    if (isVNode(value)) {
      return RenderWay.VNode;
    }
    // 其他复杂对象或数组
    return RenderWay.JsonString;
  }
  // 未知类型（兜底）
  return RenderWay.Unknown;
};

// 通过template的方式渲染TNode
export const RenderTNodeTemplate = (props: { render: Function; params: Record<string, any> }) => {
  const { render, params } = props;
  const renderResult = (typeof render === 'function') ? render(h, params) : render;
  const renderWay = getValueRenderWay(renderResult);

  // @ts-ignore
  const renderText = (c: RenderTsTypesSimple | RenderTsTypesObject) => createTextVNode(c);
  const renderMap = {
    [RenderWay.Text]: (c: RenderTsTypesSimple) => renderText(c),
    [RenderWay.JsonString]: (c: RenderTsTypesObject) => renderText(JSON.stringify(c, null, 2)),
    [RenderWay.VNode]: (c: VNode) => c,
  };

  return renderMap[renderWay] ? renderMap[renderWay](renderResult) : h(null);
};

// 通过JSX的方式渲染 TNode，props 和 插槽同时处理，也能处理默认值为 true 则渲染默认节点的情况
export const renderTNodeJSX = (instance: ComponentPublicInstance, name: string, options?: Slots | JSX.Element) => {
  const params = typeof options === 'object' && ('params' in options) ? options.params : null;
  const defaultNode = typeof options === 'object' && ('defaultNode' in options) ? options.defaultNode : options;
  let propsNode;
  if (name in instance) {
    propsNode = instance[name];
  }
  if (propsNode === false) return;
  if (propsNode === true && defaultNode) {
    return instance.$slots[name] ? instance.$slots[name](params) : defaultNode;
  }
  if (typeof propsNode === 'function') return propsNode(h, params);
  const isPropsEmpty = [undefined, params, ''].includes(propsNode);
  if (isPropsEmpty && instance.$slots[name]) return instance.$slots[name](params);
  return propsNode;
};
/**
 * 通过JSX的方式渲染 TNode，props 和 插槽同时处理。与 renderTNodeJSX 区别在于 属性值为 undefined 时会渲染默认节点
 * @param vm 组件示例
 * @param name 插槽和属性名称
 * @example renderTNodeJSX(this, 'closeBtn')
 * @example renderTNodeJSX(this, 'closeBtn', <t-icon-close />)。this.closeBtn 为空时，则兜底渲染 <t-icon-close />
 * @example renderTNodeJSX(this, 'closeBtn', { defaultNode: <t-icon-close />, params }) 。params 为渲染节点时所需的参数
 */
export const renderTNodeJSXDefault = (vm: ComponentPublicInstance, name: string, options?: Slots | JSX.Element) => {
  const defaultNode = typeof options === 'object' && 'defaultNode' in options ? options.defaultNode : options;
  return renderTNodeJSX(vm, name, options) || defaultNode;
};

// content 优先级控制：name1 优先级高于 name2
export const renderContent = (instance: ComponentPublicInstance, name1: string, name2: string) => {
  const node1 = renderTNodeJSX(instance, name1);
  const node2 = renderTNodeJSX(instance, name2);
  return [undefined, null, ''].includes(node1) ? node2 : node1;
};
