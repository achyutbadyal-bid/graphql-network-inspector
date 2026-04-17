import { AutoFormatToggleButton } from "@/components/AutoFormatToggleButton"
import { CodeView } from "@/components/CodeView"
import { CopyButton } from "@/components/CopyButton"
import { IGraphqlRequestBody } from "@/helpers/graphqlHelpers"
import * as safeJson from "@/helpers/safeJson"
import { Bar } from "@/components/Bar"
import { Panels, PanelSection } from "../PanelSection"
import { FC } from "react"
import {
  RequestViewSectionType,
  useRequestViewSections,
} from "@/hooks/useRequestViewSections"
import { CaretIcon } from "../../../components/Icons/CaretIcon"
import { ShareButton } from "../../../components/ShareButton"
import { INetworkRequest } from "@/hooks/useNetworkMonitor"

const isVariablesPopulated = (variables: Record<string, unknown>) => {
  return Object.keys(variables || {}).length > 0
}

const isExtensionsPopulated = (request: IGraphqlRequestBody) => {
  return Object.keys(request.extensions || {}).length > 0
}

const getVariables = ({ variables, extensions }: IGraphqlRequestBody) => {
  if (variables && isVariablesPopulated(variables)) {
    return variables
  }

  if (
    extensions &&
    "variables" in extensions &&
    typeof extensions.variables == "string"
  ) {
    try {
      return JSON.parse(atob(extensions.variables))
    } catch (e) {
      return null
    }
  }

  return null
}

interface IRequestViewProps {
  autoFormat: boolean
  requests: IGraphqlRequestBody[]
  onShare?: () => void
  networkRequest?: INetworkRequest
}

export const RequestView = (props: IRequestViewProps) => {
  const { requests, autoFormat, onShare, networkRequest } = props

  const numberOfRequests = requests.length
  const shouldDisplayRequestIndex = numberOfRequests > 1

  return (
    <Panels>
      {requests.map((request, index) => {
        return (
          <SingleRequestView
            key={request.id}
            request={request}
            autoFormat={autoFormat}
            index={shouldDisplayRequestIndex && index + 1}
            numberOfRequests={numberOfRequests}
            onShare={onShare}
            networkRequest={networkRequest}
          />
        )
      })}
    </Panels>
  )
}

interface ISingleRequestViewProps {
  request: IGraphqlRequestBody
  autoFormat: boolean
  index: number | false
  numberOfRequests: number
  onShare?: () => void
  networkRequest?: INetworkRequest
}

const generateCurl = (
  networkRequest?: INetworkRequest,
  request?: IGraphqlRequestBody
) => {
  if (!networkRequest || !request) return ""

  let curl = `curl '${networkRequest.url}'`
  curl += " --compressed"

  networkRequest.request.headers.forEach((header) => {
    if (
      !header.name.startsWith(":") &&
      header.name.toLowerCase() !== "content-length"
    ) {
      const escapedValue = (header.value || "").replace(/'/g, "'\\''")
      curl += ` \\\n  -H '${header.name}: ${escapedValue}'`
    }
  })

  if (networkRequest.method !== "GET") {
    const { id, ...rest } = request
    const payload = JSON.stringify(
      networkRequest.request.body.length > 1 ? [rest] : rest
    )

    curl += ` \\\n  --data-raw '${payload.replace(/'/g, "'\\''")}'`
  }

  return curl
}

const SingleRequestView = (props: ISingleRequestViewProps) => {
  const {
    request,
    autoFormat,
    index,
    numberOfRequests,
    onShare,
    networkRequest,
  } = props

  const displayQuery = !!request.query
  const variables = getVariables(request)
  const displayVariables = isVariablesPopulated(variables)
  const displayExtensions = isExtensionsPopulated(request)

  return (
    <PanelSection className="relative mb-3">
      <div className="flex items-center gap-2 absolute top-[8px] right-[8px] z-10 transition-opacity">
        {onShare && <ShareButton onClick={onShare} />}
        {networkRequest && (
          <CopyButton
            label="Copy as cURL"
            textToCopy={generateCurl(networkRequest, request)}
          />
        )}
        {displayQuery && (
          <CopyButton label="Copy Query" textToCopy={request.query} />
        )}
        {displayVariables && (
          <CopyButton
            label="Copy Vars"
            textToCopy={safeJson.stringify(variables, undefined, 2)}
          />
        )}
        {displayExtensions && (
          <CopyButton
            label="Copy Extensions"
            textToCopy={safeJson.stringify(request.extensions, undefined, 2)}
          />
        )}
      </div>

      <div className="flex flex-col">
        {displayQuery && (
          <RequestViewSection
            type="query"
            title={"Query" + (index ? ` (${index}/${numberOfRequests})` : "")}
          >
            <CodeView
              text={request.query}
              language={"graphql"}
              autoFormat={autoFormat}
              className="px-6"
            />
          </RequestViewSection>
        )}
        {displayVariables && (
          <RequestViewSection type="variables" title="Variables">
            <CodeView
              text={safeJson.stringify(variables, undefined, 2)}
              language={"json"}
              className="px-6"
            />
          </RequestViewSection>
        )}
        {displayExtensions && (
          <RequestViewSection type="extensions" title="Extensions">
            <CodeView
              text={safeJson.stringify(request.extensions, undefined, 2)}
              language={"json"}
              autoFormat={autoFormat}
              className="px-6"
            />
          </RequestViewSection>
        )}
      </div>
    </PanelSection>
  )
}

interface IRequestViewSectionProps {
  type: RequestViewSectionType
  title: string
}

const RequestViewSection: FC<IRequestViewSectionProps> = (props) => {
  const { type, title, children } = props
  const { collapsedSections, setIsSectionCollapsed } = useRequestViewSections()
  const isCollapsed = !!collapsedSections[type]

  const handleToggleView = () => {
    setIsSectionCollapsed(type, !collapsedSections[type])
  }

  return (
    <div>
      <button
        className="select-none w-full px-4 py-3 outline-[#2f80ed]"
        onClick={handleToggleView}
      >
        <div className="flex justify-be align-center tween items-center gap-2">
          <CaretIcon className={"w-2.5 " + (isCollapsed ? "" : "rotate-90")} />
          <span className="font-bold">{title}</span>
        </div>
      </button>
      {!isCollapsed && <div className="rounded-lg">{children}</div>}
    </div>
  )
}

interface IRequestViewFooterProps {
  autoFormat: boolean
  toggleAutoFormat: React.DispatchWithoutAction
}

export const RequestViewFooter = (props: IRequestViewFooterProps) => {
  const { autoFormat, toggleAutoFormat } = props

  return (
    <Bar className="mt-auto absolute border-t">
      <AutoFormatToggleButton active={autoFormat} onToggle={toggleAutoFormat} />
    </Bar>
  )
}
